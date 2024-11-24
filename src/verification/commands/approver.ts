import { Args, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import Database from '../../database/database';
import { Message, PermissionFlagsBits } from 'discord.js';

export class ApproverCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: "approver",
            description: "Manage the list of verification approvers",
            detailedDescription: "Manage the list of verification approvers",
            subcommands: [
                {
                    name: "add",
                    chatInputRun: "chatInputApproverAdd",
                    messageRun: "messageApproverAdd"
                },
                {
                    name: "remove",
                    chatInputRun: "chatInputApproverRemove",
                    messageRun: "messageApproverRemove"
                },
                {
                    name: "list",
                    chatInputRun: "chatInputApproverList",
                    messageRun: "messageApproverList"
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
                .addSubcommand((command) =>
                    command
                        .setName("add")
                        .setDescription("Add a user to the list of verification approvers")
                        .addUserOption((option) =>
                            option
                                .setName("user")
                                .setDescription("The user to add as a verification approver")
                                .setRequired(true)
                        )
                )
                .addSubcommand((command) =>
                    command
                        .setName("remove")
                        .setDescription("Remove a user from the list of verification approvers")
                        .addUserOption((option) =>
                            option
                                .setName("user")
                                .setDescription("The user to remove from the verification approvers list")
                                .setRequired(true)
                        )
                )
                .addSubcommand((command) =>
                    command
                        .setName("list")
                        .setDescription("List all verification approvers")
                )
        );
    }

    /**
     * Approver add slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputApproverAdd(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const user = interaction.options.getUser("user", true);

        const response = await Database.getInstance().addVerificationApprover(interaction.guildId!, user.id);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }

    /**
     * Approver add message command logic
     * @param message Message containing the command
     * @param args User ID, mention, or name
     */
    public async messageApproverAdd(message: Message, args: Args): Promise<void> {
        const user = await args.pick("user");

        const response = await Database.getInstance().addVerificationApprover(message.guildId!, user.id);
        await message.reply({ content: response.message });
    }

    /**
     * Approver remove slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputApproverRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const user = interaction.options.getUser("user", true);

        const response = await Database.getInstance().removeVerificationApprover(interaction.guildId!, user.id);
        await interaction.reply({ content: response.message, ephemeral: !response.success });
    }

    /**
     * Approver remove message command logic
     * @param message Message containing the command
     * @param args User ID, mention, or name
     */
    public async messageApproverRemove(message: Message, args: Args): Promise<void> {
        const user = await args.pick("user");

        const response = await Database.getInstance().removeVerificationApprover(message.guildId!, user.id);
        await message.reply({ content: response.message });
    }

    /**
     * Approver list slash command logic
     * @param interaction Interaction of the command
     */
    public async chatInputApproverList(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        const approvers = await Database.getInstance().getVerificationApprovers(interaction.guild!);
        if (!approvers) {
            await interaction.reply({ content: "No verification approvers found." });
            return;
        }

        const approverMentions = approvers.map((approver) => `<@${approver.id}>`).join("\n");
        await interaction.reply({ content: `Verification approvers:\n${approverMentions}` });
    }

    /**
     * Approver list message command logic
     * @param message Message containing the command
     */
    public async messageApproverList(message: Message): Promise<void> {
        const approvers = await Database.getInstance().getVerificationApprovers(message.guild!);
        if (!approvers) {
            await message.reply({ content: "No verification approvers found." });
            return;
        }

        const approverMentions = approvers.map((approver) => `<@${approver.id}>`).join("\n");
        await message.reply({ content: `Verification approvers:\n${approverMentions}` });
    }
}
