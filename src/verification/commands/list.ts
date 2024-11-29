import { Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import Database from '../../database/database';
import { Guild, Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { trimString } from "../../utils/utils";

export class ListCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'list',
            description: 'List all configuration settings for the guild',
            detailedDescription: "List all configuration settings for the guild",
            runIn: CommandOptionsRunTypeEnum.GuildText,
            requiredUserPermissions: [PermissionFlagsBits.Administrator]
        });
    }

    public override registerApplicationCommands(registry: Command.Registry): void {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description),
            { idHints: ["1310732575932944468"] }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        const embed = await this.fetchValues(interaction.guild!);
        await interaction.editReply({ embeds: [embed] });
    }

    public override async messageRun(message: Message): Promise<void> {
        const embed = await this.fetchValues(message.guild!);
        await message.reply({ embeds: [embed] });
    }

    private async fetchValues(guild: Guild): Promise<EmbedBuilder> {
        const database = Database.getInstance();

        const guideChannel = await database.getGuideChannel(guild);
        const guideMessage = await database.getGuideMessage(guild);

        const verificationMessage = await database.getVerificationMessage(guild);
        const verificationEndingMessage = await database.getVerificationEndingMessage(guild);
        const verificationQuestions = await database.getVerificationQuestions(guild);
        const verificationLog = await database.getVerificationLog(guild);
        const verificationApprovers = await database.getVerificationApprovers(guild);

        const questioningCategory = await database.getQuestioningCategory(guild);
        const questioningLog = await database.getQuestioningLog(guild);

        const welcomeChannel = await database.getWelcomeChannel(guild);
        const welcomeMessage = await database.getWelcomeMessage(guild);
        const welcomeToggle = await database.getWelcomeToggle(guild);

        const memberRole = await database.getMemberRole(guild);
        const unverifiedRole = await database.getUnverifiedRole(guild);
        const staffRoles = await database.getStaffRoles(guild);

        const kickReasons = await database.getKickReasons(guild);
        const banReasons = await database.getBanReasons(guild);

        const displayGuideChannel = guideChannel ? `<#${guideChannel.id}>` : 'Not set';
        const displayGuideMessage = guideMessage ? trimString(guideMessage, 1024) : 'Not set';

        const displayVerificationMessage = verificationMessage ? trimString(verificationMessage, 1024) : 'Not set';
        const displayVerificationEndingMessage = verificationEndingMessage ? trimString(verificationEndingMessage, 1024) : 'Not set';
        const displayVerificationQuestions = verificationQuestions ? trimString(verificationQuestions.reduce((accumulator, currentQuestion, index) => accumulator + `${index + 1}. ${currentQuestion}\n`, '').trim(), 1024) : 'Not set';
        const displayVerificationLog = verificationLog ? `<#${verificationLog.id}>` : 'Not set';
        const displayVerificationApprovers = verificationApprovers ? verificationApprovers.map(approver => `<@${approver.id}>`).join(', ') : 'Not set';

        const displayQuestioningCategory = questioningCategory ? `<#${questioningCategory.id}>` : 'Not set';
        const displayQuestioningLog = questioningLog ? `<#${questioningLog.id}>` : 'Not set';

        const displayWelcomeChannel = welcomeChannel ? `<#${welcomeChannel.id}>` : 'Not set';
        const displayWelcomeMessage = welcomeMessage ? trimString(welcomeMessage, 1024) : 'Not set';
        const displayWelcomeToggle = welcomeToggle ? 'Enabled' : 'Disabled';

        const displayMemberRole = memberRole ? `<@&${memberRole.id}>` : 'Not set';
        const displayUnverifiedRole = unverifiedRole ? `<@&${unverifiedRole.id}>` : 'Not set';
        const displayStaffRoles = staffRoles ? staffRoles.map(role => `<@&${role.id}>`).join(', ') : 'Not set';

        const displayKickReasons = kickReasons ? trimString(kickReasons.reduce((accumulator, currentReason, index) => accumulator + `${index + 1}. ${currentReason}\n`, '').trim(), 1024) : 'Not set';
        const displayBanReasons = banReasons ? trimString(banReasons.reduce((accumulator, currentReason, index) => accumulator + `${index + 1}. ${currentReason}\n`, '').trim(), 1024) : 'Not set';

        const displayNames = [
            'Guide channel (Where the message with the verify button will be posted)',
            'Guide message (the message with the verify button)',
            'Verification starting message (the message to post in a DM before verification',
            'Verificaton ending message (the message to post at the end of a DM verification with confirm and deny buttons)',
            'Verification questions (the list of questions)',
            'Verification log channel (the channel to put successful DM verifications in)',
            'Verification approvers (the special approvers list for serverprotector integration)',
            'Questioning category (the category to create channels for questioning in)',
            'Questioning log channel (the channel to log questioning)',
            'Welcome channel (the channel to welcome the user in after approval)',
            'Welcome message (the message to greet the user with, [member] replaces user mention)',
            'Welcome toggle (toggle whether the welcome message is posted)',
            'Member role',
            'Unverified role',
            'Staff roles',
            'Kick reasons (list of reasons to choose from for kicking)',
            'Ban reasons (list of reasons to choose from for banning)'
        ];
        const displayValues = [
            displayGuideChannel,
            displayGuideMessage,
            displayVerificationMessage,
            displayVerificationEndingMessage,
            displayVerificationQuestions,
            displayVerificationLog,
            displayVerificationApprovers,
            displayQuestioningCategory,
            displayQuestioningLog,
            displayWelcomeChannel,
            displayWelcomeMessage,
            displayWelcomeToggle,
            displayMemberRole,
            displayUnverifiedRole,
            displayStaffRoles,
            displayKickReasons,
            displayBanReasons
        ];
        const embedFields = displayValues.reduce((accumulator, currentValue, index) => accumulator.concat([{ name: displayNames[index]!, value: currentValue }]), [] as { name: string; value: string }[]);

        const embed = new EmbedBuilder()
            .setTitle(`List of configurations for ${guild.name}`)
            .addFields(embedFields);

        return embed;
    }
}