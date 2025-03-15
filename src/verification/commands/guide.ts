import {Args, CommandOptionsRunTypeEnum} from '@sapphire/framework';
import {Subcommand} from '@sapphire/plugin-subcommands';
import Database from '../../database/database';
import {ChannelType, Message, MessageFlags, PermissionFlagsBits, TextChannel} from 'discord.js';
import {getGuideComponent} from '../../types/component';
import {fetchChannelFromGuild} from "../../utils/utils";

export class GuideCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: "guide",
            description: "Manage the guide channel and message for verification",
            detailedDescription: "Manage the message with the verify button and the channel it's posted in",
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
                            .setDescription("channel group")
                            .addSubcommand((command) =>
                                command
                                    .setName("set")
                                    .setDescription("Set the channel that the message with the Verify button will be sent in")
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
                                    .setDescription("Remove the channel that the message with the Verify button will be sent in")
                            )
                    )
                    .addSubcommandGroup((group) =>
                        group
                            .setName("message")
                            .setDescription("message group")
                            .addSubcommand((command) =>
                                command
                                    .setName("set")
                                    .setDescription("Set the message that will be sent with the verify button")
                            )
                            .addSubcommand((command) =>
                                command
                                    .setName("remove")
                                    .setDescription("Remove the message that will be sent with the verify button")
                            )
                            .addSubcommand((command) =>
                                command
                                    .setName("post")
                                    .setDescription("Post or edit the guide message in the guide channel")
                            )
                    ),
            { idHints: ["1310732497809707100"] }
        );
    }

    /**
     * Guide channel set slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputGuideChannelSet(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const channel = interaction.options.getChannel("channel", true);
        if (channel.type !== ChannelType.GuildText) {
            await interaction.editReply({ content: "The channel has to be a text channel" });
            return;
        }

        const response = await Database.getInstance().setGuideChannel(interaction.guildId!, channel.id);
        await interaction.editReply({ content: response.message });
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
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const response = await Database.getInstance().removeGuideChannel(interaction.guildId!);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Gulde message set slash command logic
     * @param message Message containing the command
     */
    public async messageGuideChannelRemove(message: Message): Promise<void> {
        const response = await Database.getInstance().removeGuideChannel(message.guildId!);
        await message.reply({ content: response.message });
    }

    public async chatInputGuideMessageSet(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.editReply("Please enter the message you would like to use as the guide message below within the next 2 minutes");

        const channel = interaction.channel;
        if (!channel) {
            await interaction.editReply({ content: "There was an error finding the channel that the command was executed in" });
            return;
        }

        const permissions = (channel as TextChannel).permissionsFor(interaction.client.user);
        if (!permissions?.has(PermissionFlagsBits.ViewChannel)) {
            await interaction.editReply({ content: "The bot doesn't have the permission to see the channel" });
            return;
        }

        let guideMessage = null;
        (channel as TextChannel).awaitMessages({ errors: ["time"], filter: (message) => message.author === interaction.user, max: 1, time: 120000 })
            .then(async (messages) => {
                if (!messages.first()) {
                    await interaction.editReply({ content: "There was an error when fetching the message" });
                    return;
                }

                guideMessage = messages.first() as Message | undefined;
                if (!guideMessage) {
                    await interaction.editReply({ content: "There was an error when fetching the message" });
                    return;
                }

                const response = await Database.getInstance().setGuideMessage(interaction.guildId!, guideMessage.content.trim());
                await interaction.editReply({ content: response.message });

                if (guideMessage.deletable) {
                    guideMessage.delete();
                }
            })
            .catch(async () => {
                await interaction.editReply({ content: "No message was provided after 2 minutes" });
            });
    }

    /**
     * Gulde message set message command logic
     * @param message Message containing the command
     * @param args Text containing desired message
     */
    public async messageGuideMessageSet(message: Message): Promise<void> {
        const reply = await message.reply("Please enter the message you would like to use as the guide message below within the next 2 minutes");

        const channel = message.channel;
        if (!channel) {
            await reply.edit({ content: "There was an error finding the channel that the command was executed in" });
            return;
        }

        const permissions = (channel as TextChannel).permissionsFor(message.client.user);
        if (!permissions?.has(PermissionFlagsBits.ViewChannel)) {
            await reply.edit({ content: "The bot doesn't have the permission to see the channel" });
            return;
        }

        let guideMessage = null;
        (channel as TextChannel).awaitMessages({ errors: ["time"], filter: (msg) => msg.author === message.author, max: 1, time: 120000 })
            .then(async (messages) => {
                if (!messages.first()) {
                    await reply.edit({ content: "There was an error when fetching the message" });
                    return;
                }

                guideMessage = messages.first() as Message | undefined;
                if (!guideMessage) {
                    await reply.edit({ content: "There was an error when fetching the message" });
                    return;
                }

                const response = await Database.getInstance().setGuideMessage(message.guildId!, guideMessage.content.trim());
                await reply.edit({ content: response.message });

                if (guideMessage.deletable) {
                    guideMessage.delete();
                }
            })
            .catch(async () => {
                await reply.edit({ content: "No message was provided after 2 minutes" });
            });
    }

    /**
     * Guide message remove slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputGuideMessageRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const response = await Database.getInstance().removeGuideMessage(interaction.guildId!);
        await interaction.editReply({ content: response.message });

    }

    /**
     * Guide message remove message command logic
     * @param message Message containing the command
     */
    public async messageGuideMessageRemove(message: Message): Promise<void> {
        const response = await Database.getInstance().removeGuideMessage(message.guildId!);
        await message.reply({ content: response.message });
    }

    /**
     * Guide message post slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputGuideMessagePost(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const database = Database.getInstance();
        const guideChannel = await database.getGuideChannel(interaction.guild!);
        const guideMessage = await database.getGuideMessage(interaction.guild!);

        if (!guideChannel) {
            await interaction.editReply({ content: "The guide channel isn't set" });
            return;
        }

        if (!guideMessage) {
            await interaction.editReply({ content: "The guide message isn't set" });
            return;
        }

        const channel = await fetchChannelFromGuild(interaction.guild!, guideChannel.id);
        if (!channel) {
            await interaction.editReply({ content: "Couldn't find the guide channel" });
            return;
        }

        if (channel?.type !== ChannelType.GuildText) {
            await interaction.editReply({ content: "The guide channel has to be a text channel" });
            return;
        }

        const botPermissions = channel.permissionsFor(interaction.client.user);
        if (!botPermissions?.has(PermissionFlagsBits.SendMessages)) {
            await interaction.editReply({ content: "The bot doesn't have the send messages permission in that channel" });
            return;
        }

        if (!botPermissions.has(PermissionFlagsBits.ViewChannel)) {
            await interaction.editReply({ content: "The bot doesn't have the view channel permission in that channel" });
            return;
        }

        channel as TextChannel;

        const row = getGuideComponent(interaction.guild!.id);
        const postedMessage = await channel.send({ content: guideMessage, components: [row] });
        await interaction.editReply({ content: `Posted the guide message, you can check it out [here](<${postedMessage.url}>)` });
    }

    /**
     * Guide message post message command logic
     * @param interaction Interaction of the command
     */
    public async messageGuideMessagePost(message: Message): Promise<void> {
        const database = Database.getInstance();
        const guideChannel = await database.getGuideChannel(message.guild!);
        const guideMessage = await database.getGuideMessage(message.guild!);

        if (!guideChannel) {
            await message.reply({ content: "The guide channel isn't set" });
            return;
        }

        if (!guideMessage) {
            await message.reply({ content: "The guide message isn't set" });
            return;
        }

        const channel = await fetchChannelFromGuild(message.guild!, guideChannel.id);
        if (!channel) {
            await message.reply({ content: "Couldn't find the guide channel" });
            return;
        }

        if (channel?.type !== ChannelType.GuildText) {
            await message.reply({ content: "The guide channel has to be a text channel" });
            return;
        }

        const permissions = channel.permissionsFor(message.client.user);
        if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
            await message.reply({ content: "The bot doesn't have the send messages permission in that channel" });
            return;
        }

        channel as TextChannel;

        const row = getGuideComponent(channel.guild.id);
        const postedMessage = await channel.send({ content: guideMessage, components: [row] });
        await message.reply({ content: `Posted the guide message, you can check it out [here](<${postedMessage.url}>)` });
    }
}