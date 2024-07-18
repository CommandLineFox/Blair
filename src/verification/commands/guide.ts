import { Args, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import Database from 'database/database';
import { ChannelType, Message, PermissionFlagsBits } from 'discord.js';

export class GuideCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: "guide",
            description: "Manage the guide channel and message for verification",
            subcommands: [
                {
                    name: "channel",
                    type: "group",
                    entries: [
                        { name: "set", chatInputRun: "chatInputGuideChannelSet", messageRun: "messageGuideChannelSet" },
                        { name: "remove", chatInputRun: "chatInputGuideChannelRemove", messageRun: "messageGuideChannelRemove" }
                    ]
                },
                {
                    name: "message",
                    type: "group",
                    entries: [
                        { name: "set", chatInputRun: "chatInputGuideMessageSet", messageRun: "messageGuideMessageSet" },
                        { name: "remove", chatInputRun: "chatInputGuideMessageRemove", messageRun: "messageGuideMessageRemove" },
                        { name: "post", chatInputRun: "chatInputGuideMessagePost", messageRun: "messageGuideMessagePost" }
                    ]
                }
            ],
            runIn: CommandOptionsRunTypeEnum.GuildAny,
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
                        .setDescription("channel group")
                        .addSubcommand((command) =>
                            command
                                .setName("set")
                                .setDescription("Set the channel that guide messages will be sent in")
                                .addChannelOption((option) =>
                                    option
                                        .setName("channel")
                                        .setDescription("The text channel that guide messages will be sent in")
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("remove")
                                .setDescription("Remove the channel that guide messages will be sent in")
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName("message")
                        .setDescription("message group")
                        .addSubcommand((command) =>
                            command
                                .setName("set")
                                .setDescription("Set the message that will be sent in the guide channel")
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("remove")
                                .setDescription("Remove the message that will be sent in the guide channel")
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("post")
                                .setDescription("Post or edit the guide message in the guide channel")
                        )
                )
        );
    }

    /**
     * Guide channel set slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputGuideChannelSet(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const channel = interaction.options.getChannel("channel");
        if (!channel) {
            await interaction.reply({ content: "You need to provide a channel", ephemeral: true });
            return;
        }

        if (channel.type !== ChannelType.GuildText) {
            await interaction.reply({ content: "The channel has to be a text channel", ephemeral: true });
            return;
        }

        const response = await Database.getInstance().setGuideChannel(interaction.guildId!, channel.id);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }


    /**
     * Guide channel set message command logic
     * @param message Message containing the command 
     * @param args Text channel name, ID or mention
     */
    public async messageGuideChannelSet(message: Message, args: Args): Promise<void> {
        const channel = await args.pick("channel");
        if (channel.type !== ChannelType.GuildText) {
            message.reply({ content: "The channel has to be a text channel" });
            return;
        }

        const response = await Database.getInstance().setGuideChannel(message.guildId!, channel.id);
        await message.reply({ content: response.message });
    }

    /**
     * Guide channel remove slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputGuideChannelRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const response = await Database.getInstance().removeGuildChannel(interaction.guildId!);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }

    /**
     * Gulde channel remove message command logic
     * @param message Message containing the command 
     * @param args Desired message text
     */
    public async messageGuideChannelRemove(message: Message): Promise<void> {
        const response = await Database.getInstance().removeGuildChannel(message.guildId!);
        await message.reply({ content: response.message });
    }

    public async chatInputGuideMessageSet(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        interaction.reply("WIP");
    }

    public async messageGuideMessageSet(message: Message, args: Args): Promise<void> {
        console.log(message, args);
    }

    /**
     * Guide message remove slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputGuideMessageRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const response = await Database.getInstance().removeGuildMessage(interaction.guildId!);
        await interaction.reply({ content: response.message, ephemeral: !response.success });

    }

    /**
     * Guide message remove message command logic
     * @param message Message containing the command
     */
    public async messageGuideMessageRemove(message: Message): Promise<void> {
        const response = await Database.getInstance().removeGuildMessage(message.guildId!);
        await message.reply({ content: response.message });
    }

    public async chatInputGuideMessagePost(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const guild = await Database.getInstance().getGuild(interaction.guildId!);
        if (!guild?.config.verification?.guideChannel) {
            await interaction.reply({ content: "The guide channel isn't set", ephemeral: true });
            return;
        }

        if (!guild.config.verification.guideMessage) {
            await interaction.reply({ content: "The guide message isn't set", ephemeral: true });
        }
    }

    public async messageGuideMessagePost(message: Message, args: Args): Promise<void> {
        console.log(message, args);
    }
}