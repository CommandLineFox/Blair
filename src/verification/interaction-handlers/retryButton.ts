import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import Database from 'database/database';
import { PendingApplication } from 'database/models/pendingApllication';
import { type ButtonInteraction, type DMChannel, type Message } from 'discord.js';
import { Buttons, getDmVerificationComponent } from 'types/component';

export class ButtonHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith(Buttons.RETRY_BUTTON)) {
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

        const guild = await interaction.client.guilds.fetch(guildId);
        const user = interaction.user;
        const database = Database.getInstance();

        const verificationMessageText = await database.getVerificationMessage(guild);
        if (!verificationMessageText) {
            await interaction.reply({ content: "Couldn't find the verification message.", ephemeral: true });
            return;
        }

        const verificationEndingMessageText = await database.getVerificationEndingMessage(guild);
        if (!verificationEndingMessageText) {
            await interaction.reply({ content: "Couldn't find the verification ending message.", ephemeral: true });
            return;
        }

        const existingPendingApplication = await database.getPendingApplication(interaction.user.id, guildId);
        if (existingPendingApplication) {
            await interaction.reply({ content: "You already started the verification process.", ephemeral: true });
            return;
        }

        let verificationMessage: Message | null = null;
        try {
            verificationMessage = await user.send(verificationMessageText);
        } catch (error) {
            await interaction.reply({ content: "Couldn't message you, please make sure your DMs are open.", ephemeral: true });
            return;
        }

        if (!verificationMessage) {
            await interaction.reply({ content: "Couldn't find the message after sending it.", ephemeral: true });
            return;
        }

        const pendingApplication: PendingApplication = { userId: user.id, guildId: guild.id, requiredApprovers: [], questions: [], answers: [] };
        await database.addPendingApplication(pendingApplication);
        await interaction.reply({ content: "Please check your DMs.", ephemeral: true });

        const verificationQuestions = await database.getVerificationQuestions(guild);
        if (!verificationQuestions || verificationQuestions.length === 0) {
            await interaction.editReply({ content: "Couldn't find the questions." });
            return;
        }

        const verificationAnswers: string[] = [];
        const dmChannel = verificationMessage.channel as DMChannel;

        for (const verificationQuestion of verificationQuestions) {
            let questionMessage: Message | null = null;
            try {
                questionMessage = await dmChannel.send(verificationQuestion)
            } catch (error) {
                await interaction.editReply({ content: "Couldn't send a question, please verify again and make sure your DMs are still open." });
                await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
                return;
            }

            if (!questionMessage) {
                await interaction.editReply({ content: "Couldn't find the question after sending it please try again." });
                await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
                return;
            }

            let answerMessage: Message | undefined;
            await dmChannel?.awaitMessages({ errors: ["time"], filter: (message) => message.author === user, max: 1, time: 120000 })
                .then(async (messages) => {
                    if (!messages.first()) {
                        await questionMessage.edit({ content: "There was an error when fetching the answer you sent. Please verify again." });
                        await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
                        return;
                    }

                    answerMessage = messages.first();
                    if (!answerMessage) {
                        await questionMessage.edit({ content: "There was an error when fetching the answer message. Please verify again." });
                        await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
                        return;
                    }

                    verificationAnswers.push(answerMessage.cleanContent);
                })
                .catch(async () => {
                    await questionMessage.edit({ content: "No message was provided after 2 minutes. Please verify again." });
                    await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
                    return;
                });
        }

        await database.setPendingApplicationQuestions(interaction.user.id, guildId, verificationQuestions);
        await database.setPendingApplicationAnswers(interaction.user.id, guildId, verificationAnswers);

        const row = getDmVerificationComponent(guild.id);
        await dmChannel.send({ content: verificationEndingMessageText, components: [row] });
    }
}