import {Args, CommandOptionsRunTypeEnum} from "@sapphire/framework";
import {Subcommand} from "@sapphire/plugin-subcommands";
import Database from "../../database/database";
import {Message, MessageFlags, PermissionFlagsBits} from "discord.js";

export class AppealCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: "appeal",
            description: "Manage the ban appeal link for the guild",
            subcommands: [
                { name: "set", chatInputRun: "chatInputSetLink", messageRun: "messageSetLink" },
                { name: "remove", chatInputRun: "chatInputRemoveLink", messageRun: "messageRemoveLink" },
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
                    .addSubcommand((command) =>
                        command
                            .setName("set")
                            .setDescription("Set the ban appeal link")
                            .addStringOption((option) =>
                                option
                                    .setName("link")
                                    .setDescription("The URL for the ban appeal form")
                                    .setRequired(true)
                            )
                    )
                    .addSubcommand((command) =>
                        command
                            .setName("remove")
                            .setDescription("Remove the ban appeal link")
                    ),
            { idHints: [] }
        );
    }

    /**
     * Set appeal link via Slash
     */
    public async chatInputSetLink(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) await interaction.deleteReply();
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const link = interaction.options.getString("link", true);

        const response = await Database.getInstance().setBanAppealLink(interaction.guildId!, link);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Set appeal link via Message
     */
    public async messageSetLink(message: Message, args: Args): Promise<void> {
        const link = await args.pick("string").catch(() => null);

        if (!link) {
            await message.reply({ content: "You need to provide a valid URL link." });
            return;
        }

        const response = await Database.getInstance().setBanAppealLink(message.guildId!, link);
        await message.reply({ content: response.message });
    }

    /**
     * Remove appeal link via Slash
     */
    public async chatInputRemoveLink(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) await interaction.deleteReply();
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const response = await Database.getInstance().removeBanAppealLink(interaction.guildId!);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Remove appeal link via Message
     */
    public async messageRemoveLink(message: Message): Promise<void> {
        const response = await Database.getInstance().removeBanAppealLink(message.guildId!);
        await message.reply({ content: response.message });
    }
}