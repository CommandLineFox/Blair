import { Args, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import { Subcommand } from "@sapphire/plugin-subcommands";
import Database from "database/database";
import { ChannelType, Message, PermissionFlagsBits } from "discord.js";

export class VerificationCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: "verification",
            description: "Manage the verification questions and logging channel",
            subcommands: [
                {
                    name: "question",
                    type: "group",
                    entries: [
                        { name: "add", chatInputRun: "chatInputQuestionsAdd", messageRun: "messageQuestionsAdd" },
                        { name: "remove", chatInputRun: "chatInputQuestionsRemove", messageRun: "messageQuestionsRemove" },
                        { name: "move", chatInputRun: "chatInputQuestionsMove", messageRun: "messageQuestionsMove" }
                    ]
                },
                {
                    name: "log",
                    type: "group",
                    entries: [
                        { name: "set", chatInputRun: "chatInputLogSet", messageRun: "messageLogSet" },
                        { name: "remove", chatInputRun: "chatInputLogRemove", messageRun: "messageLogRemove" }
                    ]
                }
            ],
            runIn: CommandOptionsRunTypeEnum.GuildText,
            requiredUserPermissions: [PermissionFlagsBits.Administrator]
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addSubcommandGroup((group) =>
                    group
                        .setName("question")
                        .setDescription("Manage verification questions")
                        .addSubcommand((command) =>
                            command
                                .setName("add")
                                .setDescription("Add a verification question")
                                .addStringOption((option) =>
                                    option
                                        .setName("question")
                                        .setDescription("The verification question to add")
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("remove")
                                .setDescription("Remove a verification question")
                                .addIntegerOption((option) =>
                                    option
                                        .setName("index")
                                        .setDescription("The index of the question to remove")
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("move")
                                .setDescription("Move a verification question")
                                .addIntegerOption((option) =>
                                    option
                                        .setName("from")
                                        .setDescription("Index of the question to move")
                                        .setRequired(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName("to")
                                        .setDescription("New index of the question")
                                        .setRequired(true)
                                )
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName("log")
                        .setDescription("Manage the verification log channel")
                        .addSubcommand((command) =>
                            command
                                .setName("set")
                                .setDescription("Set the channel where verification logs will be sent")
                                .addChannelOption((option) =>
                                    option
                                        .setName("channel")
                                        .setDescription("The text channel for verification logs")
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("remove")
                                .setDescription("Remove the verification log channel")
                        )
                )
        );
    }

    /**
     * Verification question add slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputQuestionsAdd(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const question = interaction.options.getString("question", true);
        const response = await Database.getInstance().addVerificationQuestion(interaction.guildId!, question);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }

    /**
     * Verification question add message command logic
     * @param message Message containing the command
     * @param args Text argument containing the question
     */
    public async messageQuestionsAdd(message: Message, args: Args): Promise<void> {
        const question = await args.rest("string");
        if (!question) {
            await message.reply({ content: "You need to provide a question." });
            return;
        }

        const response = await Database.getInstance().addVerificationQuestion(message.guildId!, question);
        await message.reply({ content: response.message });
    }

    /**
     * Verification question remove slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputQuestionsRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const index = interaction.options.getInteger("index", true);
        if (index < 0) {
            await interaction.reply({ content: "You need to provide a valid index.", ephemeral: true });
            return;
        }

        const response = await Database.getInstance().removeVerificationQuestion(interaction.guildId!, index);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }

    /**
     * Verification question remove message command logic
     * @param message Message containing the command
     * @param args Text argument containing the index
     */
    public async messageQuestionsRemove(message: Message, args: Args): Promise<void> {
        const index = await args.pick("integer");
        if (index === null || index < 0) {
            await message.reply({ content: "You need to provide a valid index." });
            return;
        }

        const response = await Database.getInstance().removeVerificationQuestion(message.guildId!, index);
        await message.reply({ content: response.message });
    }

    /**
     * Verification question move slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputQuestionsMove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const fromIndex = interaction.options.getInteger("from", true) - 1;
        const toIndex = interaction.options.getInteger("to", true) - 1;
        if (fromIndex < 0 || toIndex < 0) {
            await interaction.reply({ content: "You need to provide valid indices.", ephemeral: true });
            return;
        }

        const response = await Database.getInstance().repositionVerificationQuestion(interaction.guildId!, fromIndex, toIndex);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }

    /**
     * Verification question move message command logic
     * @param message Message containing the command
     * @param args Text arguments containing the from and to indices
     */
    public async messageQuestionsMove(message: Message, args: Args): Promise<void> {
        const fromIndex = await args.pick("integer") - 1;
        const toIndex = await args.pick("integer") - 1;
        if (fromIndex === null || toIndex === null || fromIndex < 0 || toIndex < 0) {
            await message.reply({ content: "You need to provide valid indices." });
            return;
        }

        const response = await Database.getInstance().repositionVerificationQuestion(message.guildId!, fromIndex, toIndex);
        await message.reply({ content: response.message });
    }

    /**
     * Verification log set slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputLogSet(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const channel = interaction.options.getChannel("channel", true);
        if (channel.type !== ChannelType.GuildText) {
            await interaction.reply({ content: "You need to provide a valid text channel.", ephemeral: true });
            return;
        }

        const response = await Database.getInstance().setVerificationLog(interaction.guildId!, channel.id);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }

    /**
     * Verification log set message command logic
     * @param message Message containing the command
     * @param args Text argument containing the channel ID
     */
    public async messageLogSet(message: Message, args: Args): Promise<void> {
        const channelId = await args.pick("string");
        const channel = message.guild?.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
            await message.reply({ content: "You need to provide a valid text channel." });
            return;
        }

        const response = await Database.getInstance().setVerificationLog(message.guildId!, channel.id);
        await message.reply({ content: response.message });
    }

    /**
     * Verification log remove slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputLogRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const response = await Database.getInstance().removeVerificationLog(interaction.guildId!);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }

    /**
     * Verification log remove message command logic
     * @param message Message containing the command
     */
    public async messageLogRemove(message: Message): Promise<void> {
        const response = await Database.getInstance().removeVerificationLog(message.guildId!);
        await message.reply({ content: response.message });
    }
}