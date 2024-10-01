import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import Database from 'database/database';
import type { ButtonInteraction, DMChannel } from 'discord.js';
import { Buttons } from 'types/component';

export class ButtonHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override async parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith(Buttons.CONFIRM_BUTTON)) {
            return this.none();
        }

        const guildId = interaction.customId.split("_")[1];
        if (!guildId) {
            return this.none();
        }

        const guild = interaction.client.guilds.cache.find((g) => g.id === guildId);
        if (!guild) {
            return this.none();
        }
        return this.some(guildId);
    }

    /**
     * Handle what happens when the Verify button gets pressed in the guide channel
     * Initiating verification through DMs
     * @param interaction 
     */
    public async run(interaction: ButtonInteraction, guildId: string): Promise<void> {
        const channel = await interaction.client.channels.fetch(interaction.channelId);
        if (!channel) {
            await interaction.reply({ content: "Couldn't find the channel.", ephemeral: true });
            return;
        }

        const message = await (channel as DMChannel).messages.fetch(interaction.message.id);
        await message.edit({ content: interaction.message.content, components: [] });

        const user = interaction.user;
        const database = Database.getInstance();

        const pendingApplication = await database.getPendingApplication(user.id, guildId);
        if (!pendingApplication) {
            await interaction.reply({ content: "There was an error finding your application", ephemeral: true });
            return;
        }

        await interaction.reply("Sent");
    }
}