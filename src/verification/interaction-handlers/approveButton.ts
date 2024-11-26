import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import Database from '../../database/database';
import { Colors, EmbedBuilder, PermissionFlagsBits, type ButtonInteraction } from 'discord.js';
import { Buttons } from '../../types/component';
import { isStaff } from '../../utils/utils';

export class ApproveButtonHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override async parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith(Buttons.APPROVE_BUTTON)) {
            return this.none();
        }

        return this.some();
    }

    /**
     * Handle what happens when the approve button gets pressed in the verification log channel
     * @param interaction The button interaction
     */
    public async run(interaction: ButtonInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.guild) {
            await interaction.editReply({ content: "This button can only work in a guild" });
            return;
        }

        if (!interaction.member) {
            await interaction.editReply({ content: "Couldn't find the member that started the interaction" });
            return;
        }

        const staffMember = await interaction.guild.members.fetch(interaction.member.user.id);
        if (!staffMember) {
            await interaction.editReply({ content: "Couldn't find the member in the server" });
            return;
        }

        const botPermissions = interaction.guild.members.me?.permissions;;
        if (!botPermissions?.has(PermissionFlagsBits.ManageRoles)) {
            await interaction.editReply({ content: "The bot doesn't have the manage roles permission" });
            return;
        }

        const staffCheck = await isStaff(staffMember);
        if (!staffCheck) {
            await interaction.editReply({ content: "Only staff members can interact with this" });
            return;
        }

        const channel = await interaction.client.channels.fetch(interaction.channelId);
        if (!channel) {
            await interaction.editReply({ content: "Couldn't find the channel." });
            return;
        }

        const database = Database.getInstance();

        const messageId = interaction.message.id;
        const pendingApplication = await database.getPendingApplicationFromMessage(messageId);
        if (!pendingApplication) {
            await interaction.editReply({ content: "Couldn't find the pending application." });
            return;
        }

        //If the pending application requires approval from approvers, first check for those
        if (pendingApplication.requiredApprovers.length > 0) {
            if (!pendingApplication.requiredApprovers.includes(staffMember.id)) {
                await interaction.editReply({ content: "Still waiting approvals from required approvers" });
                return;
            }

            await database.removePendingApplicationApprover(pendingApplication.userId, pendingApplication.guildId, staffMember.id);

            const oldEmbed = interaction.message.embeds[0];
            if (!oldEmbed) {
                await interaction.editReply({ content: "Couldn't find the embed of the message" });
                return;
            }

            const newEmbed = new EmbedBuilder(oldEmbed.data)
                .setFields([]);

            if (!oldEmbed.data.fields) {
                await interaction.editReply({ content: "Couldn't find embed fields" });
                return;
            }
            for (const field of oldEmbed.data.fields) {
                if (field.name === "Required approvals") {
                    continue;
                }

                newEmbed.addFields(field);
            }

            //Update the embed with the remaining required approvals if there are any
            const filteredApprovers = pendingApplication.requiredApprovers.filter((approver) => approver !== staffMember.id);
            if (filteredApprovers.length > 0) {
                const updatedApprovers = filteredApprovers.map((approver) => `<@${approver}>`).join(", ").trim();
                newEmbed.addFields({ name: "Required approvals", value: updatedApprovers });
            }

            await interaction.message.edit({ content: interaction.message.content, embeds: [newEmbed], components: interaction.message.components });
            await interaction.editReply({ content: "Approved, please approve again if no more required approvals are left or wait for others" });
            return;
        }

        //Adding member role and removing unverified role if it exists
        const unverifiedRole = await database.getUnverifiedRole(interaction.guild);
        const memberRole = await database.getMemberRole(interaction.guild);

        if (!memberRole) {
            await interaction.editReply({ content: "Couldn't find the member role." });
            return;
        }

        const member = await interaction.guild.members.fetch(pendingApplication.userId);
        if (!member) {
            await interaction.editReply({ content: "Couldn't find the member." });
            return;
        }

        const oldEmbed = interaction.message.embeds[0];
        if (!oldEmbed) {
            await interaction.editReply({ content: "There was an error finding the embed." });
            return;
        }

        if (unverifiedRole) {
            await member.roles.remove(unverifiedRole);
        }

        await member.roles.add(memberRole);

        //Updating the message to indicate approval of user
        const newEmbed = new EmbedBuilder(oldEmbed.data)
            .setTitle(`${oldEmbed.title} | Approved`)
            .setColor(Colors.Green)
            .addFields({ name: "Handled by", value: `${staffMember.user.username} (${staffMember.id})` });

        await interaction.message.edit({ embeds: [newEmbed], components: [] });

        //Sending the welcome message
        const welcomeToggle = await database.getWelcomeToggle(interaction.guild);
        if (welcomeToggle) {
            const welcomeChannel = await database.getWelcomeChannel(interaction.guild);
            if (!welcomeChannel) {
                await interaction.editReply({ content: "Couldn't find the welcome channel" });
                return;
            }

            let welcomeMessage = await database.getWelcomeMessage(interaction.guild);
            if (!welcomeMessage) {
                await interaction.editReply({ content: "Couldn't find the welcome message" });
                return;
            }

            welcomeMessage = welcomeMessage.replace(/\[member\]/g, `<@${member.id}>`);
            await welcomeChannel.send(welcomeMessage);
        }

        await database.removePendingApplication(member.id, interaction.guild.id);
    }
}