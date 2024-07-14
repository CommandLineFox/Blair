import { Events, Listener, type MessageCommandDeniedPayload, type UserError } from '@sapphire/framework';

export class MessageCommandDenied extends Listener<typeof Events.MessageCommandDenied> {
    public run(error: UserError, { message }: MessageCommandDeniedPayload) {
        return message.channel.send(error.message);
    }
}