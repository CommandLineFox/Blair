import { Listener } from '@sapphire/framework';
import Database from '../../database/database';
import { PermissionFlagsBits, type Client, type Message, type TextChannel } from 'discord.js';
import { Config } from '../../types/config';

export class LoadOptOutListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, once: true, event: "ready" });
    }

    /**
     * Run method for the client.on("ready") event
     * @param client The client that just logged in
     */
    public async run(client: Client): Promise<void> {
        const database = Database.getInstance();

        const guilds = client.guilds.cache;

        for (const [_guildId, guild] of guilds) {
            const searchChannel = await database.getVerificationHistory(guild);
            if (!searchChannel) {
                continue;
            }

            if (!guild.members.me) {
                continue;
            }

            const botPermissions = searchChannel.permissionsFor(guild.members.me);
            if (!botPermissions.has(PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory)) {
                continue;
            }

            const messages = await this.getMessages(searchChannel);
            for (const message of messages) {

                const embed = message.embeds[0];
                if (!embed || !embed.title) {
                    continue;
                }

                const username = embed.title.split(" ")[0]?.split("#")[0];
                if (!username) {
                    continue;
                }

                await guild.members.fetch();
                const user = guild.members.cache.find((member) => member.user.username === username)
                if (!user) {
                    continue;
                }

                await database.addOptOut(user.id);
            }
        }
    }

    private async getMessages(channel: TextChannel): Promise<Message[]> {
        const config = Config.getInstance();
        const botId = config.getClientConfig().serverProtectorId;
        const botMessage = config.getClientConfig().serverProtectorMessage;

        const messages: Message[] = [];
        let oldest: Message | undefined;

        while (true) {
            const fetchedMessages = await channel.messages.fetch({ limit: 100, before: oldest?.id, cache: false });

            if (fetchedMessages.size === 0) {
                break;
            }

            const filteredMessages = fetchedMessages.filter((message) => message.author.id === botId && message.embeds.some(embed => embed.title?.includes(botMessage)));
            messages.push(...filteredMessages.toJSON());
            oldest = fetchedMessages.last();
        }

        return messages;
    }
}