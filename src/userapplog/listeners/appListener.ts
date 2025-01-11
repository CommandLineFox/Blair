import { Listener } from '@sapphire/framework';
import { EmbedBuilder, Message, PermissionFlagsBits } from 'discord.js';
import Database from '../../database/database';
import { trimString } from '../../utils/utils';

export class AppListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, event: "messageCreate" });
    }

    public async run(message: Message): Promise<void> {
        if (!message.guild) {
            return;
        }

        if (!message.author.bot) {
            return;
        }

        //The authorization field has either a guild id or a user id in it
        const authorizingIntegrationOwners = message.interactionMetadata?.authorizingIntegrationOwners;
        const user = message.interactionMetadata?.user;

        if (!authorizingIntegrationOwners || !user?.id || !Object.values(authorizingIntegrationOwners).includes(user.id)) {
            return;
        }

        const database = Database.getInstance();

        const userAppLogEnabled = await database.getUserAppLogToggle(message.guild);
        if (!userAppLogEnabled) {
            return;
        }

        const userAppLogChannel = await database.getUserAppLogChannel(message.guild);
        if (!userAppLogChannel) {
            return;
        }

        //Check if the bot can send messages in the log channel
        const permissions = userAppLogChannel.permissionsFor(message.client.user);
        if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
            return;
        }

        const embed = new EmbedBuilder()
            .addFields(
                { name: "User", value: `${user.username} (${user.id})` },
                { name: "Application", value: `${message.author.username} (${message.author.id})` },
                { name: "Message url", value: message.url }
            )

        if (message.content.length) {
            embed.addFields([{ name: "Message text", value: trimString(message.content, 1024) }]);
        }

        if (message.attachments.size > 0) {
            embed.addFields([{ name: "Attachments", value: `${message.attachments.map(attachment => attachment.url).join('\n')}` }]);
        }

        if (message.embeds.length > 0) {
            embed.addFields([{ name: "Embed count", value: `${message.embeds.length}` }]);
        }

        await userAppLogChannel.send({ embeds: [embed] });
    }
}