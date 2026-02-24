import {Args, Command, CommandOptionsRunTypeEnum} from '@sapphire/framework';
import {GuildMember, Message, MessageFlags, PermissionFlagsBits} from 'discord.js';
import Database from "../../database/database";
import {CustomResponse} from "../../types/customResponse";

export class BanCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "echo",
            description: 'Echo',
            detailedDescription: "Echo",
            requiredUserPermissions: [PermissionFlagsBits.BanMembers],
            requiredClientPermissions: [PermissionFlagsBits.BanMembers],
            runIn: CommandOptionsRunTypeEnum.GuildText,
            preconditions: ['UptimeCheck']
        });
    }

    public override registerApplicationCommands(registry: Command.Registry): void {
        registry.registerChatInputCommand((builder) =>
                builder
                    .setName(this.name)
                    .setDescription(this.description)
                    .addUserOption((option) =>
                        option
                            .setName("user")
                            .setDescription("The user to ban")
                            .setRequired(true)
                    )
                    .addStringOption((option) =>
                        option
                            .setName("reason")
                            .setDescription("The reason for the ban")
                            .setRequired(false)
                    ),
            { idHints: ["1310732664600268922"] }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', false) ?? "No reason provided";
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (!interaction.channel) {
            await interaction.editReply({ content: "Couldn't find the channel" });
            return;
        }

        if (!interaction.guild) {
            await interaction.editReply({ content: "This command only runs in a guild" });
            return;
        }

        const member = await interaction.guild.members.fetch(user.id);

        const result = await this.ban(member, reason);
        await interaction.editReply({ content: result.message });
    }

    public override async messageRun(message: Message, args: Args): Promise<void> {
        const user = await args.pick("user");
        const reason = await args.rest("string").catch(() => "No reason provided");

        if (!user) {
            return;
        }

        if (!message.guild) {
            return;
        }

        const member = await message.guild.members.fetch(user.id);

        const result = await this.ban(member, reason);
        await message.reply({ content: result.message });
    }

    /**
     * Ban a member from the server
     * @param member The member to ban
     * @param reason The reason for the ban, defaults to "No reason provided" if not provided
     * @returns Success or error to be sent as ephemeral message for the slash command
     */
    private async ban(member: GuildMember, reason: string): Promise<CustomResponse> {
        if (!member.bannable) {
            return { success: false, message: "The member is not bannable" };
        }

        const database = Database.getInstance();
        if (!database) {
            return { success: false, message: "Couldn't find the database" };
        }

        const banAppealLink = await database.getBanAppealLink(member.guild);
        if (!banAppealLink) {
            return { success: false, message: "Couldn't find the ban appeal link" };
        }

        await member.send(`You have been banned from ${member.guild.name} for the following reason: ${reason}\n\nAppeal here: ${banAppealLink}`);
        await member.ban({ reason: reason });
        return { success: true, message: "Successfully banned" };
    }
}