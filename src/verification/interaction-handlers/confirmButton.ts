import {InteractionHandler, InteractionHandlerTypes} from '@sapphire/framework';
import Database from '../../database/database';
import {MessageFlags, type ButtonInteraction, type DMChannel} from 'discord.js';
import {Buttons} from '../../types/component';
import {blockFreshInteraction, postVerificationMessage} from '../../utils/utils';

export class ConfirmButtonHandler extends InteractionHandler {
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
     * Handle what happens when the confirm button gets pressed in a DM channel
     * @param interaction The button interaction
     * @param guildId The ID of the guild
     */
    public async run(interaction: ButtonInteraction, guildId: string): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        //Prevent this from running if the bot was started less than 5 minutes ago
        const blockInteraction = await blockFreshInteraction(interaction);
        if (blockInteraction) {
            return;
        }

        const channel = await interaction.client.channels.fetch(interaction.channelId);
        if (!channel) {
            await interaction.editReply({ content: "Couldn't find the channel." });
            return;
        }

        const message = await (channel as DMChannel).messages.fetch(interaction.message.id);
        await message.edit({ content: interaction.message.content, components: [] });

        const user = await interaction.user.fetch();
        const database = Database.getInstance();

        const pendingApplication = await database.getPendingApplication(user.id, guildId);
        if (!pendingApplication) {
            await interaction.editReply({ content: "There was an error finding your application." });
            return;
        }

        const guild = await interaction.client.guilds.fetch(guildId);

        await postVerificationMessage(guild, interaction, user, pendingApplication);

        await interaction.editReply({ content: "Successfully applied, please be patient." });
    }
}