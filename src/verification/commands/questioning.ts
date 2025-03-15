import {CommandOptionsRunTypeEnum, Args} from "@sapphire/framework";
import {Subcommand} from "@sapphire/plugin-subcommands";
import Database from "../../database/database";
import {PermissionFlagsBits, ChannelType, Message, MessageFlags} from "discord.js";

export class QuestioningCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: "questioning",
            description: "Manage the questioning category and logs",
            detailedDescription: "Manage the category to create questioning channels in and log to post questioning after completion in",
            subcommands: [
                {
                    name: "category",
                    type: "group",
                    entries: [
                        { name: "set", chatInputRun: "chatInputCategorySet", messageRun: "messageCategorySet" },
                        { name: "remove", chatInputRun: "chatInputCategoryRemove", messageRun: "messageCategoryRemove" }
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
            requiredUserPermissions: [PermissionFlagsBits.Administrator],
            preconditions: ['UptimeCheck']
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry): void {
        registry.registerChatInputCommand((builder) =>
                builder
                    .setName(this.name)
                    .setDescription(this.description)
                    .addSubcommandGroup((group) =>
                        group
                            .setName("category")
                            .setDescription("Manage the questioning category")
                            .addSubcommand((command) =>
                                command
                                    .setName("set")
                                    .setDescription("Set the questioning category")
                                    .addStringOption((option) =>
                                        option
                                            .setName("category")
                                            .setDescription("The category for questioning")
                                            .setRequired(true)
                                    )
                            )
                            .addSubcommand((command) =>
                                command
                                    .setName("remove")
                                    .setDescription("Remove the questioning category")
                            )
                    )
                    .addSubcommandGroup((group) =>
                        group
                            .setName("log")
                            .setDescription("Manage the questioning log channel")
                            .addSubcommand((command) =>
                                command
                                    .setName("set")
                                    .setDescription("Set the channel where questioning logs will be sent")
                                    .addChannelOption((option) =>
                                        option
                                            .setName("channel")
                                            .setDescription("The text channel for questioning logs")
                                            .setRequired(true)
                                    )
                            )
                            .addSubcommand((command) =>
                                command
                                    .setName("remove")
                                    .setDescription("Remove the questioning log channel")
                            )
                    ),
            { idHints: ["1310732577987891282"] }
        );
    }

    /**
     * Questioning category set slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputCategorySet(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const categoryId = interaction.options.getString("category", true);
        const category = await interaction.guild?.channels.fetch(categoryId);
        if (!category || category.type !== ChannelType.GuildCategory) {
            await interaction.editReply({ content: "You need to provide a valid category channel." });
            return;
        }

        const response = await Database.getInstance().setQuestioningCategory(interaction.guildId!, category.id);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Questioning category set message command logic
     * @param message Message containing the command
     * @param args Text channel name or ID
     */
    public async messageCategorySet(message: Message, args: Args): Promise<void> {
        const categoryId = await args.pick("string");
        const category = message.guild?.channels.cache.get(categoryId);
        if (!category || category.type !== ChannelType.GuildCategory) {
            await message.reply({ content: "You need to provide a valid category channel." });
            return;
        }

        const response = await Database.getInstance().setQuestioningCategory(message.guildId!, category.id);
        await message.reply({ content: response.message });
    }

    /**
     * Questioning category remove slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputCategoryRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const response = await Database.getInstance().removeQuestioningCategory(interaction.guildId!);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Questioning category remove message command logic
     * @param message Message containing the command
     */
    public async messageCategoryRemove(message: Message): Promise<void> {
        const response = await Database.getInstance().removeQuestioningCategory(message.guildId!);
        await message.reply({ content: response.message });
    }

    /**
     * Questioning log set slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputLogSet(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const channel = interaction.options.getChannel("channel", true);
        if (channel.type !== ChannelType.GuildText) {
            await interaction.editReply({ content: "You need to provide a valid text channel." });
            return;
        }

        const response = await Database.getInstance().setQuestioningLog(interaction.guildId!, channel.id);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Questioning log set message command logic
     * @param message Message containing the command
     * @param args Text channel name, ID or mention
     */
    public async messageLogSet(message: Message, args: Args): Promise<void> {
        const channelId = await args.pick("string");
        const channel = message.guild?.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
            await message.reply({ content: "You need to provide a valid text channel." });
            return;
        }

        const response = await Database.getInstance().setQuestioningLog(message.guildId!, channel.id);
        await message.reply({ content: response.message });
    }

    /**
     * Questioning log remove slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputLogRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const response = await Database.getInstance().removeQuestioningLog(interaction.guildId!);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Questioning log remove message command logic
     * @param message Message containing the command
     */
    public async messageLogRemove(message: Message): Promise<void> {
        const response = await Database.getInstance().removeQuestioningLog(message.guildId!);
        await message.reply({ content: response.message });
    }
}