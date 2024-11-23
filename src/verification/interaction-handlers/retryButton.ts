import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import Database from '../../database/database';
import { type ButtonInteraction, type DMChannel, type Message } from 'discord.js';
import { Buttons, getDmVerificationComponent } from '../../types/component';
import { postVerificationMessage } from '../../utils/utils';

export class RetryButtonHandler extends InteractionHandler {
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
     * Handle what happens when the retry button gets pressed in a DM channel
     * @param interaction The button interaction
     * @param guildId The guild that this verification is from
     */
    public async run(interaction: ButtonInteraction, guildId: string): Promise<void> {
        await interaction.reply("Retrying application:");
        const channel = await interaction.client.channels.fetch(interaction.channelId);
        if (!channel) {
            await interaction.editReply({ content: "Couldn't find the channel." });
            return;
        }

        const message = await (channel as DMChannel).messages.fetch(interaction.message.id);
        await message.edit({ content: interaction.message.content, components: [] });

        const guild = await interaction.client.guilds.fetch(guildId);
        const user = await interaction.user.fetch();
        const database = Database.getInstance();

        const verificationMessageText = await database.getVerificationMessage(guild);
        if (!verificationMessageText) {
            await interaction.editReply({ content: "Couldn't find the verification message." });
            return;
        }

        const verificationEndingMessageText = await database.getVerificationEndingMessage(guild);
        if (!verificationEndingMessageText) {
            await interaction.editReply({ content: "Couldn't find the verification ending message." });
            return;
        }

        const pendingApplication = await database.getPendingApplication(interaction.user.id, guildId);
        if (!pendingApplication) {
            await interaction.editReply({ content: "There was an error finding your current application." });
            return;
        }

        //No more retries
        if (pendingApplication.attempts === 3) {
            await interaction.editReply("You tried so hard, and got so far. But in the end, it doesn't even matter");
            await postVerificationMessage(guild, interaction, user, pendingApplication, true);
            return;
        }

        let verificationMessage: Message | null = null;
        try {
            verificationMessage = await user.send(verificationMessageText);
        } catch (error) {
            await interaction.editReply({ content: "Couldn't message you, please make sure your DMs are open." });
            return;
        }

        if (!verificationMessage) {
            await interaction.editReply({ content: "Couldn't find the message after sending it." });
            return;
        }

        const verificationQuestions = await database.getVerificationQuestions(guild);
        if (!verificationQuestions || verificationQuestions.length === 0) {
            await interaction.editReply({ content: "Couldn't find the questions." });
            return;
        }

        const verificationAnswers: string[] = [];
        const dmChannel = verificationMessage.channel as DMChannel;

        //Post questions to the user and gather answers
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

        const answers = pendingApplication.answers;
        for (const answer of verificationAnswers) {
            answers.push(answer);
        }

        const questionResult = await database.setPendingApplicationQuestions(user.id, guild.id, verificationQuestions);
        if (!questionResult.success) {
            await interaction.editReply({ content: "There was an error when saving the questions." });
            await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
            return;
        }

        const answerResult = await database.setPendingApplicationAnswers(user.id, guild.id, answers);
        if (!answerResult.success) {
            await interaction.editReply({ content: "There was an error when saving the answers." });
            await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
            return;
        }

        const increaseAttemptsResult = await database.increasePendingApplicationAttempts(user.id, guild.id);
        if (!increaseAttemptsResult.success) {
            await interaction.editReply({ content: "There was an error when increasing a counter." });
            await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
            return;
        }
        const row = getDmVerificationComponent(guild.id, user.id);
        await dmChannel.send({ content: verificationEndingMessageText, components: [row] });
    }
}