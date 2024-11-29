import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import Database from "../../database/database";
import { PendingApplication } from "../../database/models/pendingApllication";
import { ButtonInteraction, Message, DMChannel } from "discord.js";
import { Buttons, getDmVerificationComponent } from "../../types/component";
import { blockFreshInteraction } from "../../utils/utils";

export class VerifyButtonHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith(Buttons.VERIFY_BUTTON)) {
            return this.none();
        }

        return this.some();
    }

    /**
     * Handle what happens when the Verify button gets pressed in the guide channel
     * @param interaction The button interaction
     */
    public async run(interaction: ButtonInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ ephemeral: true });

        //Prevent this from running if the bot was started less than 5 minutes ago
        const blockInteraction = await blockFreshInteraction(interaction);
        if (blockInteraction) {
            return;
        }

        if (!interaction.guild) {
            await interaction.editReply({ content: "This button can only work in a guild" });
            return;
        }

        const user = interaction.user;
        const database = Database.getInstance();

        const verificationMessageText = await database.getVerificationMessage(interaction.guild);
        if (!verificationMessageText) {
            await interaction.editReply({ content: "Couldn't find the verification message." });
            return;
        }

        const verificationEndingMessageText = await database.getVerificationEndingMessage(interaction.guild);
        if (!verificationEndingMessageText) {
            await interaction.editReply({ content: "Couldn't find the verification ending message." });
            return;
        }

        const approvers = await database.getVerificationApprovers(interaction.guild);
        if (!approvers) {
            await interaction.editReply({ content: "Couldn't find the list of approvers." });
            return;
        }

        const existingPendingApplication = await database.getPendingApplication(interaction.user.id, interaction.guild.id);
        if (existingPendingApplication) {
            await interaction.editReply({ content: "You already started the verification process." });
            return;
        }

        let requiredApprovers: string[] = [];
        const optedOut = await database.getOptOut(user.id);
        if (optedOut) {
            requiredApprovers = approvers?.map((approver) => approver.id);
        }

        const pendingApplication: PendingApplication = { userId: user.id, guildId: interaction.guild.id, requiredApprovers: requiredApprovers, questions: [], answers: [], attempts: 0 };

        const createApplicationResult = await database.addPendingApplication(pendingApplication);
        if (!createApplicationResult.success) {
            await interaction.editReply({ content: "There was an error creating the pending application or you are applying elsewhere" });
            await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
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

        await interaction.editReply({ content: "Please check your DMs." });

        const verificationQuestions = await database.getVerificationQuestions(interaction.guild);
        if (!verificationQuestions || verificationQuestions.length === 0) {
            await interaction.editReply({ content: "Couldn't find the questions." });
            return;
        }

        const verificationAnswers: string[] = [];
        const dmChannel = await interaction.client.channels.fetch(verificationMessage.channel.id) as DMChannel;

        //Post questions and gather answers
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
            let success = true;
            await dmChannel?.awaitMessages({ errors: ["time"], filter: (message) => message.author === user, max: 1, time: 120000 })
                .then(async (messages) => {
                    if (!messages.first()) {
                        await questionMessage.edit({ content: "There was an error when fetching the answer you sent. Please verify again." });
                        await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
                        success = false;
                        return;
                    }

                    answerMessage = messages.first();
                    if (!answerMessage) {
                        await questionMessage.edit({ content: "There was an error when fetching the answer message. Please verify again." });
                        await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
                        success = false;
                        return;
                    }

                    verificationAnswers.push(answerMessage.cleanContent);
                })
                .catch(async () => {
                    await questionMessage.edit({ content: "No message was provided after 2 minutes. Please verify again." });
                    await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
                    success = false;
                    return;
                });

            if (!success) {
                return;
            }
        }

        const questionResult = await database.setPendingApplicationQuestions(user.id, interaction.guild.id, verificationQuestions);
        if (!questionResult.success) {
            await interaction.editReply({ content: "There was an error when saving the questions." });
            await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
            return;
        }

        const answerResult = await database.setPendingApplicationAnswers(user.id, interaction.guild.id, verificationAnswers);
        if (!answerResult.success) {
            await interaction.editReply({ content: "There was an error when saving the answers." });
            await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
            return;
        }

        const increaseAttemptsResult = await database.increasePendingApplicationAttempts(user.id, interaction.guild.id);
        if (!increaseAttemptsResult.success) {
            await interaction.editReply({ content: "There was an error when increasing a counter." });
            await database.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
            return;
        }

        const row = getDmVerificationComponent(interaction.guild.id, user.id);
        await dmChannel.send({ content: verificationEndingMessageText, components: [row] });
    }
}