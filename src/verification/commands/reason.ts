import { Args, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import { Subcommand } from "@sapphire/plugin-subcommands";
import Database from "../../database/database";
import { Message, MessageFlags, PermissionFlagsBits } from "discord.js";

export class ReasonCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: "reason",
            description: "Manage the ban and kick reasons for the guild",
            detailedDescription: "Manage the ban and kick reasons for the guild",
            subcommands: [
                {
                    name: "ban",
                    type: "group",
                    entries: [
                        { name: "add", chatInputRun: "chatInputBanAdd", messageRun: "messageBanAdd" },
                        { name: "remove", chatInputRun: "chatInputBanRemove", messageRun: "messageBanRemove" },
                    ],
                },
                {
                    name: "kick",
                    type: "group",
                    entries: [
                        { name: "add", chatInputRun: "chatInputKickAdd", messageRun: "messageKickAdd" },
                        { name: "remove", chatInputRun: "chatInputKickRemove", messageRun: "messageKickRemove" },
                    ],
                },
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
                        .setName("ban")
                        .setDescription("Manage ban reasons")
                        .addSubcommand((command) =>
                            command
                                .setName("add")
                                .setDescription("Add a ban reason")
                                .addStringOption((option) =>
                                    option
                                        .setName("reason")
                                        .setDescription("The ban reason to add")
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("remove")
                                .setDescription("Remove a ban reason")
                                .addIntegerOption((option) =>
                                    option
                                        .setName("index")
                                        .setDescription("The index of the ban reason to remove")
                                        .setRequired(true)
                                )
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName("kick")
                        .setDescription("Manage kick reasons")
                        .addSubcommand((command) =>
                            command
                                .setName("add")
                                .setDescription("Add a kick reason")
                                .addStringOption((option) =>
                                    option
                                        .setName("reason")
                                        .setDescription("The kick reason to add")
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("remove")
                                .setDescription("Remove a kick reason")
                                .addIntegerOption((option) =>
                                    option
                                        .setName("index")
                                        .setDescription("The index of the kick reason to remove")
                                        .setRequired(true)
                                )
                        )
                ),
            { idHints: ["1310732579573338232"] }
        );
    }

    /**
     * Add a ban reason using slash command
     * @param interaction Interaction for the command
     */
    public async chatInputBanAdd(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const reason = interaction.options.getString("reason", true);
        const response = await Database.getInstance().addBanReason(interaction.guildId!, reason);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Add a ban reason using message command
     * @param message Message containing the command
     * @param args Text argument containing the reason
     */
    public async messageBanAdd(message: Message, args: Args): Promise<void> {
        const reason = await args.rest("string");
        if (!reason) {
            await message.reply({ content: "You need to provide a ban reason." });
            return;
        }

        const response = await Database.getInstance().addBanReason(message.guildId!, reason);
        await message.reply({ content: response.message });
    }

    /**
     * Remove a ban reason using slash command
     * @param interaction Interaction for the command
     */
    public async chatInputBanRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const index = interaction.options.getInteger("index", true);
        const response = await Database.getInstance().removeBanReason(interaction.guildId!, index);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Remove a ban reason using message command
     * @param message Message containing the command
     * @param args Text argument containing the index
     */
    public async messageBanRemove(message: Message, args: Args): Promise<void> {
        const index = await args.pick("integer");
        if (index === undefined) {
            await message.reply({ content: "You need to provide the index of the ban reason to remove." });
            return;
        }

        const response = await Database.getInstance().removeBanReason(message.guildId!, index);
        await message.reply({ content: response.message });
    }

    /**
     * Add a kick reason using slash command
     * @param interaction Interaction for the command
     */
    public async chatInputKickAdd(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const reason = interaction.options.getString("reason", true);
        const response = await Database.getInstance().addKickReason(interaction.guildId!, reason);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Add a kick reason using message command
     * @param message Message containing the command
     * @param args Text argument containing the reason
     */
    public async messageKickAdd(message: Message, args: Args): Promise<void> {
        const reason = await args.rest("string");
        if (!reason) {
            await message.reply({ content: "You need to provide a kick reason." });
            return;
        }

        const response = await Database.getInstance().addKickReason(message.guildId!, reason);
        await message.reply({ content: response.message });
    }

    /**
     * Remove a kick reason using slash command
     * @param interaction Interaction for the command
     */
    public async chatInputKickRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const index = interaction.options.getInteger("index", true);
        const response = await Database.getInstance().removeKickReason(interaction.guildId!, index);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Remove a kick reason using message command
     * @param message Message containing the command
     * @param args Text argument containing the index
     */
    public async messageKickRemove(message: Message, args: Args): Promise<void> {
        const index = await args.pick("integer");
        if (index === undefined) {
            await message.reply({ content: "You need to provide the index of the kick reason to remove." });
            return;
        }

        const response = await Database.getInstance().removeKickReason(message.guildId!, index);
        await message.reply({ content: response.message });
    }
}