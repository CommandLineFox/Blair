import { Listener } from '@sapphire/framework';
import Database from '../../database/database';
import { PermissionFlagsBits, type Message } from 'discord.js';
import { Config } from '../../types/config';

export class newOptOut extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, event: "messageCreate" });
    }

    public async run(message: Message): Promise<void> {
        if (!message.guild) {
            return;
        }

        const database = Database.getInstance();
        const searchChannel = await database.getVerificationHistory(message.guild);
        if (!searchChannel) {
            return;
        }


        if (message.channel !== searchChannel) {
            return;
        }

        if (!message.guild.members.me) {
            return;
        }

        const botPermissions = searchChannel.permissionsFor(message.guild.members.me);
        if (!botPermissions.has(PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory)) {
            return;
        }

        const config = Config.getInstance();
        const botId = config.getClientConfig().serverProtectorId;
        const botMessage = config.getClientConfig().serverProtectorMessage;

        if (message.author.id !== botId || !message.embeds[0]?.title?.includes(botMessage)) {
            return;
        }

        const username = message.embeds[0].title.split(" ")[0]?.split("#")[0];
        if (!username) {
            return;
        }

        await message.guild.members.fetch();
        const user = message.guild.members.cache.find((member) => member.user.username === username);
        if (!user) {
            return;
        }

        await database.addOptOut(user.id);
    }
}
