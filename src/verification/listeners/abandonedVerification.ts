import { Listener } from '@sapphire/framework';
import Database from '../../database/database';
import { Colors, EmbedBuilder, type GuildMember } from 'discord.js';

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
