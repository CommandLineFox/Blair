import { CommandOptionsRunTypeEnum, Args } from "@sapphire/framework";
import { Subcommand } from "@sapphire/plugin-subcommands";
import Database from "database/database";
import { PermissionFlagsBits, ChannelType, Message } from "discord.js";

export class WelcomeCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: "welcome",
            description: "Manage the welcome channel, message, and toggle",
            subcommands: [
                {
                    name: "channel",
                    type: "group",
                    entries: [
                        { name: "set", chatInputRun: "chatInputChannelSet", messageRun: "messageChannelSet" },
                        { name: "remove", chatInputRun: "chatInputChannelRemove", messageRun: "messageChannelRemove" }
                    ]
                },
                {
                    name: "message",
                    type: "group",
                    entries: [
                        { name: "set", chatInputRun: "chatInputMessageSet", messageRun: "messageMessageSet" },
                        { name: "remove", chatInputRun: "chatInputMessageRemove", messageRun: "messageMessageRemove" }
                    ]
                },
                {
                    name: "toggle",
                    type: "group",
                    entries: [
                        { name: "enable", chatInputRun: "chatInputToggleEnable", messageRun: "messageToggleEnable" },
                        { name: "disable", chatInputRun: "chatInputToggleDisable", messageRun: "messageToggleDisable" }
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
                        .setName("channel")
                        .setDescription("Manage the welcome channel")
                        .addSubcommand((command) =>
                            command
                                .setName("set")
                                .setDescription("Set the channel where welcome messages will be sent")
                                .addChannelOption((option) =>
                                    option
                                        .setName("channel")
                                        .setDescription("The text channel for welcome messages")
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("remove")
                                .setDescription("Remove the welcome channel")
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName("message")
                        .setDescription("Manage the welcome message")
                        .addSubcommand((command) =>
                            command
                                .setName("set")
                                .setDescription("Set the welcome message")
                                .addStringOption((option) =>
                                    option
                                        .setName("message")
                                        .setDescription("The welcome message to set")
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("remove")
                                .setDescription("Remove the welcome message")
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName("toggle")
                        .setDescription("Toggle the welcome message feature")
                        .addSubcommand((command) =>
                            command
                                .setName("enable")
                                .setDescription("Enable the welcome message feature")
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("disable")
                                .setDescription("Disable the welcome message feature")
                        )
                )
        );
    }

    /**
     * Welcome channel set slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputChannelSet(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const channel = interaction.options.getChannel("channel", true);
        if (channel.type !== ChannelType.GuildText) {
            await interaction.reply({ content: "You need to provide a valid text channel.", ephemeral: true });
            return;
        }

        const response = await Database.getInstance().setWelcomeChannel(interaction.guildId!, channel.id);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }

    /**
     * Welcome channel set message command logic
     * @param message Message containing the command
     * @param args Text channel ID or mention
     */
    public async messageChannelSet(message: Message, args: Args): Promise<void> {
        const channelId = await args.pick("string");
        const channel = message.guild?.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
            await message.reply({ content: "You need to provide a valid text channel." });
            return;
        }

        const response = await Database.getInstance().setWelcomeChannel(message.guildId!, channel.id);
        await message.reply({ content: response.message });
    }

    /**
     * Welcome channel remove slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputChannelRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const response = await Database.getInstance().removeWelcomeChannel(interaction.guildId!);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }

    /**
     * Welcome channel remove message command logic
     * @param message Message containing the command
     */
    public async messageChannelRemove(message: Message): Promise<void> {
        const response = await Database.getInstance().removeWelcomeChannel(message.guildId!);
        await message.reply({ content: response.message });
    }

    /**
     * Welcome message set slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputMessageSet(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const messageContent = interaction.options.getString("message", true);
        const response = await Database.getInstance().setWelcomeMessage(interaction.guildId!, messageContent);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }

    /**
     * Welcome message set message command logic
     * @param message Message containing the command
     * @param args Text message content
     */
    public async messageMessageSet(message: Message, args: Args): Promise<void> {
        const messageContent = await args.pick("string");
        const response = await Database.getInstance().setWelcomeMessage(message.guildId!, messageContent);
        await message.reply({ content: response.message });
    }

    /**
     * Welcome message remove slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputMessageRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const response = await Database.getInstance().removeWelcomeMessage(interaction.guildId!);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }

    /**
     * Welcome message remove message command logic
     * @param message Message containing the command
     */
    public async messageMessageRemove(message: Message): Promise<void> {
        const response = await Database.getInstance().removeWelcomeMessage(message.guildId!);
        await message.reply({ content: response.message });
    }

    /**
     * Welcome toggle enable slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputToggleEnable(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const response = await Database.getInstance().enableWelcomeToggle(interaction.guildId!);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }

    /**
     * Welcome toggle enable message command logic
     * @param message Message containing the command
     */
    public async messageToggleEnable(message: Message): Promise<void> {
        const response = await Database.getInstance().enableWelcomeToggle(message.guildId!);
        await message.reply({ content: response.message });
    }

    /**
     * Welcome toggle disable slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputToggleDisable(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const response = await Database.getInstance().disableWelcomeToggle(interaction.guildId!);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }

    /**
     * Welcome toggle disable message command logic
     * @param message Message containing the command
     */
    public async messageToggleDisable(message: Message): Promise<void> {
        const response = await Database.getInstance().disableWelcomeToggle(message.guildId!);
        await message.reply({ content: response.message });
    }
}
