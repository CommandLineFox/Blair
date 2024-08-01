import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { Buttons } from 'types/component';

export class ButtonHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override parse(interaction: ButtonInteraction) {
        if (interaction.customId !== Buttons.CONFIRM_BUTTON) {
            return this.none();
        }

        return this.some();
    }

    /**
     * Handle what happens when the Verify button gets pressed in the guide channel
     * Initiating verification through DMs
     * @param interaction 
     */
    public async run(interaction: ButtonInteraction): Promise<void> {
        await interaction.reply({ content: "Egg", ephemeral: true });
    }
}