import {CommandOptionsRunTypeEnum, Args} from "@sapphire/framework";
import {Subcommand} from "@sapphire/plugin-subcommands";
import Database from "../../database/database";
import {PermissionFlagsBits, ChannelType, Message, MessageFlags} from "discord.js";

export class AppLogCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: "applog",
            description: "Manage the application logging channel and toggle",
            detailedDescription: "Manage the channel where application logs are sent and toggle the feature on or off",
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
                    name: "toggle",
                    type: "group",
                    entries: [
                        { name: "enable", chatInputRun: "chatInputToggleEnable", messageRun: "messageToggleEnable" },
                        { name: "disable", chatInputRun: "chatInputToggleDisable", messageRun: "messageToggleDisable" }
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
                            .setName("channel")
                            .setDescription("Manage the application logging channel")
                            .addSubcommand((command) =>
                                command
                                    .setName("set")
                                    .setDescription("Set the channel for application logs")
                                    .addChannelOption((option) =>
                                        option
                                            .setName("channel")
                                            .setDescription("The text channel for application logs")
                                            .setRequired(true)
                                    )
                            )
                            .addSubcommand((command) =>
                                command
                                    .setName("remove")
                                    .setDescription("Remove the application logging channel")
                            )
                    )
                    .addSubcommandGroup((group) =>
                        group
                            .setName("toggle")
                            .setDescription("Toggle the application logging feature")
                            .addSubcommand((command) =>
                                command
                                    .setName("enable")
                                    .setDescription("Enable the application logging feature")
                            )
                            .addSubcommand((command) =>
                                command
                                    .setName("disable")
                                    .setDescription("Disable the application logging feature")
                            )
                    ),
            { idHints: ["1327395197608263781"] }
        );
    }

    /**
     * AppLog channel set slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputChannelSet(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const channel = interaction.options.getChannel("channel", true);
        if (channel.type !== ChannelType.GuildText) {
            await interaction.editReply({ content: "You need to provide a valid text channel." });
            return;
        }

        const response = await Database.getInstance().setUserAppLogChannel(interaction.guildId!, channel.id);
        await interaction.editReply({ content: response.message });
    }

    /**
     * AppLog channel set message command logic
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

        const response = await Database.getInstance().setUserAppLogChannel(message.guildId!, channel.id);
        await message.reply({ content: response.message });
    }

    /**
     * AppLog channel remove slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputChannelRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const response = await Database.getInstance().removeUserAppLogChannel(interaction.guildId!);
        await interaction.editReply({ content: response.message });
    }

    /**
     * AppLog channel remove message command logic
     * @param message Message containing the command
     */
    public async messageChannelRemove(message: Message): Promise<void> {
        const response = await Database.getInstance().removeUserAppLogChannel(message.guildId!);
        await message.reply({ content: response.message });
    }

    /**
     * AppLog toggle enable slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputToggleEnable(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const response = await Database.getInstance().enableUserAppLog(interaction.guildId!);
        await interaction.editReply({ content: response.message });
    }

    /**
     * AppLog toggle enable message command logic
     * @param message Message containing the command
     */
    public async messageToggleEnable(message: Message): Promise<void> {
        const response = await Database.getInstance().enableUserAppLog(message.guildId!);
        await message.reply({ content: response.message });
    }

    /**
     * AppLog toggle disable slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputToggleDisable(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const response = await Database.getInstance().disableUserAppLog(interaction.guildId!);
        await interaction.editReply({ content: response.message });
    }

    /**
     * AppLog toggle disable message command logic
     * @param message Message containing the command
     */
    public async messageToggleDisable(message: Message): Promise<void> {
        const response = await Database.getInstance().disableUserAppLog(message.guildId!);
        await message.reply({ content: response.message });
    }
}