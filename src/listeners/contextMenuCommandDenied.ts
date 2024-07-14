import { Events, Listener, type ContextMenuCommandDeniedPayload, type UserError } from '@sapphire/framework';

export class ContextMenuCommandDenied extends Listener<typeof Events.ContextMenuCommandDenied> {
    public run(error: UserError, { interaction }: ContextMenuCommandDeniedPayload) {
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply({ content: error.message });
        }

        return interaction.reply({ content: error.message, ephemeral: true });
    }
}