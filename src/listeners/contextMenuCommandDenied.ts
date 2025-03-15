import {Events, Listener, type ContextMenuCommandDeniedPayload, type UserError} from '@sapphire/framework';
import {InteractionResponse, Message, MessageFlags} from 'discord.js';

export class ContextMenuCommandDenied extends Listener<typeof Events.ContextMenuCommandDenied> {
    public run(error: UserError, { interaction }: ContextMenuCommandDeniedPayload): Promise<Message<boolean>> | Promise<InteractionResponse<boolean>> {
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply({ content: error.message });
        }

        return interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral });
    }
}