import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import Database from 'database/database';
import { Colors, EmbedBuilder, Message, PermissionFlagsBits, TextChannel, StringSelectMenuInteraction } from 'discord.js';
import { Menus } from 'types/component';

export class KickMenuHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.SelectMenu
        });
    }

    public override async parse(interaction: StringSelectMenuInteraction) {
        if (!interaction.customId.startsWith(Menus.KICK_MENU)) {
            return this.none();
        }

        const messageId = interaction.customId.split("_")[1];
        if (!messageId) {
            return this.none();
        }

        const verificationMessage = await interaction.channel?.messages.fetch(messageId);
        if (!verificationMessage) {
            return this.none();
        }
        return this.some(verificationMessage);
    }

    /**
     * Handle what happens when the kick button is pressed in the verification log channel
     * @param interaction The menu interaction
     */
    public async run(interaction: StringSelectMenuInteraction, verificationMessage: Message): Promise<void> {
        if (!interaction.guild) {
            await interaction.reply({ content: "This menu can only work in a guild", ephemeral: true });
            return;
        }

        if (!interaction.member) {
            await interaction.reply({ content: "Couldn't find the member that started the interaction", ephemeral: true });
            return;
        }

        const staffMember = await interaction.guild.members.fetch(interaction.member.user.id);
        if (!staffMember) {
            await interaction.reply({ content: "Couldn't find the member in the server", ephemeral: true });
            return;
        }

        const channel = await interaction.client.channels.fetch(interaction.channelId) as TextChannel;
        if (!channel) {
            await interaction.reply({ content: "Couldn't find the channel.", ephemeral: true });
            return;
        }

        const database = Database.getInstance();
        const messageId = verificationMessage.id;
        const pendingApplication = await database.getPendingApplicationFromMessage(messageId);
        if (!pendingApplication) {
            await interaction.reply({ content: "Couldn't find the pending application.", ephemeral: true });
            return;
        }

        const member = await interaction.guild.members.fetch(pendingApplication.userId);
        if (!member) {
            await interaction.reply({ content: "Couldn't find the member.", ephemeral: true });
            return;
        }

        const oldEmbed = verificationMessage.embeds[0];
        if (!oldEmbed) {
            await interaction.reply({ content: "There was an error finding the embed.", ephemeral: true });
            return;
        }

        //Check if the bot can add the permission override for the channel
        const permissionsRoles = channel.permissionsFor(staffMember);
        if (!permissionsRoles?.has(PermissionFlagsBits.ManageRoles)) {
            await interaction.reply({ content: "The bot doesn't have the manage roles permission in that channel", ephemeral: true });
            return;
        }

        //Check if the bot can delete the staff member's message in the channel
        const permissionsDelete = channel.permissionsFor(staffMember);
        if (!permissionsDelete?.has(PermissionFlagsBits.ManageMessages)) {
            await interaction.reply({ content: "The bot doesn't have the manage messages permission in that channel", ephemeral: true });
            return;
        }

        const choices = interaction.values;
        let reason: string | undefined = choices[0];

        //Get a custom reason by allowing the staff member to write in the channel for 2 minutes
        if (reason === "Custom") {
            //Set permission override to allow staff member to send messages in the channel
            await channel.permissionOverwrites.create(staffMember, { SendMessages: true });

            try {
                const reply = await interaction.reply({ content: "Please provide the custom kick reason within 2 minutes:", ephemeral: true });

                const collectedMessages = await channel.awaitMessages({
                    filter: (msg) => msg.author.id === staffMember.id,
                    max: 1,
                    time: 120000,
                    errors: ['time']
                });

                const customMessage = collectedMessages.first();
                if (!customMessage) {
                    await reply.edit({ content: "No reason was provided in time." });
                    return;
                }

                reason = customMessage.content.trim();

                if (customMessage.deletable) {
                    await customMessage.delete();
                }
            } catch {
                await interaction.followUp({ content: "Time expired for providing a custom reason.", ephemeral: true });
                return;
            } finally {
                await channel.permissionOverwrites.delete(staffMember);
            }
        }

        //Send the reason to the user and ban them
        reason = reason ?? "Kicked during verification";
        await member.send(`You've been kicked from ${interaction.guild.name} during verification for the following reason: ${reason}`);
        await member.kick(reason);

        //Update the embed to indicate banning the user
        const newEmbed = new EmbedBuilder(oldEmbed.data)
            .setTitle(`${oldEmbed.title} | Kicked`)
            .setColor(Colors.Red)
            .addFields({ name: "Handled by", value: `${staffMember.user.username} (${staffMember.id})` });

        await interaction.followUp({ content: "Kicked", ephemeral: true });
        await verificationMessage.edit({ embeds: [newEmbed], components: [] });
        await database.removePendingApplication(member.id, interaction.guild.id);
    }
}
