import { Args, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import { Subcommand } from "@sapphire/plugin-subcommands";
import Database from "../../database/database";
import { Message, PermissionFlagsBits } from "discord.js";

export class RoleCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: "role",
            description: "Manage member, unverified, and staff roles",
            detailedDescription: "Manage member role, unverified role, and staff role list",
            subcommands: [
                {
                    name: "member",
                    type: "group",
                    entries: [
                        { name: "set", chatInputRun: "chatInputMemberRoleSet", messageRun: "messageMemberRoleSet" },
                        { name: "remove", chatInputRun: "chatInputMemberRoleRemove", messageRun: "messageMemberRoleRemove" }
                    ]
                },
                {
                    name: "unverified",
                    type: "group",
                    entries: [
                        { name: "set", chatInputRun: "chatInputUnverifiedRoleSet", messageRun: "messageUnverifiedRoleSet" },
                        { name: "remove", chatInputRun: "chatInputUnverifiedRoleRemove", messageRun: "messageUnverifiedRoleRemove" }
                    ]
                },
                {
                    name: "staff",
                    type: "group",
                    entries: [
                        { name: "add", chatInputRun: "chatInputStaffRoleAdd", messageRun: "messageStaffRoleAdd" },
                        { name: "remove", chatInputRun: "chatInputStaffRoleRemove", messageRun: "messageStaffRoleRemove" }
                    ]
                }
            ],
            runIn: CommandOptionsRunTypeEnum.GuildText,
            requiredUserPermissions: [PermissionFlagsBits.Administrator]
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry): void {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addSubcommandGroup((group) =>
                    group
                        .setName("member")
                        .setDescription("Manage the member role")
                        .addSubcommand((command) =>
                            command
                                .setName("set")
                                .setDescription("Set the member role")
                                .addRoleOption((option) =>
                                    option
                                        .setName("role")
                                        .setDescription("The member role to set")
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("remove")
                                .setDescription("Remove the member role")
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName("unverified")
                        .setDescription("Manage the unverified role")
                        .addSubcommand((command) =>
                            command
                                .setName("set")
                                .setDescription("Set the unverified role")
                                .addRoleOption((option) =>
                                    option
                                        .setName("role")
                                        .setDescription("The unverified role to set")
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("remove")
                                .setDescription("Remove the unverified role")
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName("staff")
                        .setDescription("Manage the staff roles")
                        .addSubcommand((command) =>
                            command
                                .setName("add")
                                .setDescription("Add a staff role")
                                .addRoleOption((option) =>
                                    option
                                        .setName("role")
                                        .setDescription("The staff role to add")
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((command) =>
                            command
                                .setName("remove")
                                .setDescription("Remove a staff role")
                                .addRoleOption((option) =>
                                    option
                                        .setName("role")
                                        .setDescription("The staff role to remove")
                                        .setRequired(true)
                                )
                        )
                ),
            { idHints: ["1310732581364437135"] }
        );
    }

    /**
     * Member role set slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputMemberRoleSet(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        await await interaction.deferReply({ ephemeral: true });

        const role = interaction.options.getRole("role", true);
        const response = await Database.getInstance().setMemberRole(interaction.guildId!, role.id);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Member role set message command logic
     * @param message Message containing the command
     * @param args Text argument containing the role ID
     */
    public async messageMemberRoleSet(message: Message, args: Args): Promise<void> {
        const roleId = await args.pick("string");
        const role = message.guild?.roles.cache.get(roleId);
        if (!role) {
            await message.reply({ content: "You need to provide a valid role." });
            return;
        }

        const response = await Database.getInstance().setMemberRole(message.guildId!, role.id);
        await message.reply({ content: response.message });
    }

    /**
     * Member role remove slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputMemberRoleRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        await await interaction.deferReply({ ephemeral: true });

        const response = await Database.getInstance().removeMemberRole(interaction.guildId!);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Member role remove message command logic
     * @param message Message containing the command
     */
    public async messageMemberRoleRemove(message: Message): Promise<void> {
        const response = await Database.getInstance().removeMemberRole(message.guildId!);
        await message.reply({ content: response.message });
    }

    /**
     * Unverified role set slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputUnverifiedRoleSet(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        await await interaction.deferReply({ ephemeral: true });

        const role = interaction.options.getRole("role", true);
        const response = await Database.getInstance().setUnverifiedRole(interaction.guildId!, role.id);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Unverified role set message command logic
     * @param message Message containing the command
     * @param args Text argument containing the role ID
     */
    public async messageUnverifiedRoleSet(message: Message, args: Args): Promise<void> {
        const roleId = await args.pick("string");
        const role = message.guild?.roles.cache.get(roleId);
        if (!role) {
            await message.reply({ content: "You need to provide a valid role." });
            return;
        }

        const response = await Database.getInstance().setUnverifiedRole(message.guildId!, role.id);
        await message.reply({ content: response.message });
    }

    /**
     * Unverified role remove slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputUnverifiedRoleRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        await await interaction.deferReply({ ephemeral: true });

        const response = await Database.getInstance().removeUnverifiedRole(interaction.guildId!);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Unverified role remove message command logic
     * @param message Message containing the command
     */
    public async messageUnverifiedRoleRemove(message: Message): Promise<void> {
        const response = await Database.getInstance().removeUnverifiedRole(message.guildId!);
        await message.reply({ content: response.message });
    }

    /**
     * Staff role add slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputStaffRoleAdd(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        await await interaction.deferReply({ ephemeral: true });

        const role = interaction.options.getRole("role", true);
        const response = await Database.getInstance().addStaffRole(interaction.guildId!, role.id);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Staff role add message command logic
     * @param message Message containing the command
     * @param args Text argument containing the role ID
     */
    public async messageStaffRoleAdd(message: Message, args: Args): Promise<void> {
        const roleId = await args.pick("string");
        const role = message.guild?.roles.cache.get(roleId);
        if (!role) {
            await message.reply({ content: "You need to provide a valid role." });
            return;
        }

        const response = await Database.getInstance().addStaffRole(message.guildId!, role.id);
        await message.reply({ content: response.message });
    }

    /**
     * Staff role remove slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputStaffRoleRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        await await interaction.deferReply({ ephemeral: true });

        const role = interaction.options.getRole("role", true);
        const response = await Database.getInstance().removeStaffRole(interaction.guildId!, role.id);
        await interaction.editReply({ content: response.message });
    }

    /**
     * Staff role remove message command logic
     * @param message Message containing the command
     * @param args Text argument containing the role ID
     */
    public async messageStaffRoleRemove(message: Message, args: Args): Promise<void> {
        const roleId = await args.pick("string");
        const role = message.guild?.roles.cache.get(roleId);
        if (!role) {
            await message.reply({ content: "You need to provide a valid role." });
            return;
        }

        const response = await Database.getInstance().removeStaffRole(message.guildId!, role.id);
        await message.reply({ content: response.message });
    }
}
