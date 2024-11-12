import { Events, Listener, type MessageCommandDeniedPayload, type UserError } from '@sapphire/framework';
import { TextChannel } from 'discord.js';

export class MessageCommandDenied extends Listener<typeof Events.MessageCommandDenied> {
    public run(error: UserError, { message }: MessageCommandDeniedPayload) {
        return (message.channel as TextChannel).send(error.message);
    }
}