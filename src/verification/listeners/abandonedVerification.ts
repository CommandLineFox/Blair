import {Listener} from '@sapphire/framework';
import Database from '../../database/database';
import {Colors, EmbedBuilder, type GuildMember, PermissionFlagsBits, TextChannel} from 'discord.js';
import {logQuestioning} from "../../utils/utils";

export class newOptOut extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, event: "guildMemberRemove" });
    }

    public async run(member: GuildMember): Promise<void> {
        const guild = member.guild;
        const database = Database.getInstance();

        const verificationLog = await database.getVerificationLog(guild);
        if (!verificationLog) {
            return;
        }

        const pendingApplication = await database.getPendingApplication(member.id, guild.id);
        if (!pendingApplication) {
            return;
        }

        if (pendingApplication.questioningChannelId) {
            const questioningLogChannel = await database.getQuestioningLog(guild);
            if (!questioningLogChannel) {
                return;
            }

            const questioningChannel = await guild.channels.fetch(pendingApplication.questioningChannelId);
            if (!questioningChannel) {
                return;
            }

            const botPermissions = guild.members.me?.permissions;
            if (!botPermissions?.has(PermissionFlagsBits.ManageChannels)) {
                return;
            }

            await logQuestioning(questioningChannel as TextChannel, questioningLogChannel, member);
            await questioningChannel.delete("Questioning abandoned");
        }

        const messageId = pendingApplication.messageId;
        if (messageId) {
            const message = await verificationLog.messages.fetch(messageId);

            const oldEmbed = message.embeds[0];
            if (oldEmbed) {
                if (oldEmbed.title?.includes("Kicked") || oldEmbed.title?.includes("Banned")) {
                    return;
                }

                const newEmbed = new EmbedBuilder(oldEmbed.data)
                    .setTitle(`${oldEmbed.title} | Left`)
                    .setColor(Colors.DarkOrange);

                await message.edit({ content: message.content, embeds: [newEmbed], components: [] });
            }
        }

        await database.removePendingApplication(member.id, guild.id);
    }
}