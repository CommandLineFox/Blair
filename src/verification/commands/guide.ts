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
            requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
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

    public async chatInputGuideChannelSet(interaction: Subcommand.ChatInputCommandInteraction) {
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

    public async chatInputGuideChannelRemove(interaction: Subcommand.ChatInputCommandInteraction) {
        interaction.reply("WIP");
    }

    public async chatInputGuideMessageSet(interaction: Subcommand.ChatInputCommandInteraction) {
        interaction.reply("WIP");
    }

    public async chatInputGuideMessageRemove(interaction: Subcommand.ChatInputCommandInteraction) {
        interaction.reply("WIP");

    }

    public async chatInputGuideMessagePost(interaction: Subcommand.ChatInputCommandInteraction) {
        interaction.reply("WIP");
    }

    public async messageGuideChannelSet(message: Message, args: Args) {
        const channel = await args.pick("channel");
        if (channel.type !== ChannelType.GuildText) {
            message.reply({ content: "The channel has to be a text channel" });
        }

        const response = await Database.getInstance().setGuideChannel(message.guildId!, channel.id);
        await message.reply({ content: response.message });
    }

    public async messageGuideChannelRemove(message: Message, args: Args) {
        console.log(message, args);
    }

    public async messageGuideMessageSet(message: Message, args: Args) {
        console.log(message, args);
    }

    public async messageGuideMessageRemove(message: Message, args: Args) {
        console.log(message, args);
    }

    public async messageGuideMessagePost(message: Message, args: Args) {
        console.log(message, args);
    }
}