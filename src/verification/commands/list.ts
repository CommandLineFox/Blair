import { Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import Database from 'database/database';
import { CommandInteraction, Guild, Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { trimString } from "utils/utils";

export class ListCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'list',
            description: 'List all configuration settings for the guild.',
            runIn: CommandOptionsRunTypeEnum.GuildText,
            requiredUserPermissions: [PermissionFlagsBits.Administrator]
        });
    }

    public override async chatInputRun(interaction: CommandInteraction) {
        const embed = await this.fetchValues(interaction.guild!);
        interaction.reply({ embeds: [embed] });
    }

    public override async messageRun(message: Message) {
        const embed = await this.fetchValues(message.guild!);
        message.reply({ embeds: [embed] });
    }

    private async fetchValues(guild: Guild): Promise<EmbedBuilder> {
        const database = Database.getInstance();

        const guideChannel = await database.getGuideChannel(guild);
        const guideMessage = await database.getGuideMessage(guild);

        const verificationMessage = await database.getVerificationMessage(guild);
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

        const displayGuideChannel = guideChannel ? `<#${guideChannel.id}>` : 'Not set';
        const displayGuideMessage = guideMessage ? trimString(guideMessage, 1024) : 'Not set';

        const displayVerificationMessage = verificationMessage ? trimString(verificationMessage, 1024) : 'Not set';
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

        const displayNames = [
            'Guide channel',
            'Guide message',
            'Verification message',
            'Verification questions',
            'Verification log channel',
            'Verification approvers',
            'Questioning category',
            'Questioning log channel',
            'Welcome channel',
            'Welcome message',
            'Welcome toggle',
            'Member role',
            'Unverified role',
            'Staff roles',
        ];
        const displayValues = [
            displayGuideChannel,
            displayGuideMessage,
            displayVerificationMessage,
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
        ];
        const embedFields = displayValues.reduce((accumulator, currentValue, index) => accumulator.concat([{ name: displayNames[index]!, value: currentValue }]), [] as { name: string; value: string }[]);

        const embed = new EmbedBuilder()
            .setTitle(`List of configurations for ${guild.name}`)
            .addFields(embedFields);

        return embed;
    }
}