import {Events, Listener, type MessageCommandDeniedPayload, type UserError} from '@sapphire/framework';
import {Message, TextChannel} from 'discord.js';

export class MessageCommandDenied extends Listener<typeof Events.MessageCommandDenied> {
    public run(error: UserError, { message }: MessageCommandDeniedPayload): Promise<Message<true>> {
        return (message.channel as TextChannel).send(error.message);
    }
}