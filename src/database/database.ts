import {container} from "@sapphire/framework";
import {CategoryChannel, ChannelType, Guild, GuildMember, Role, TextChannel} from "discord.js";
import mongoose, {Document, Model, Schema} from "mongoose";
import {DatabaseConfig} from "../types/config";
import {CustomResponse} from "../types/customResponse";
import {fetchChannelFromGuild, fetchMember, fetchRole, trimString} from "../utils/utils";
import {DatabaseGuild} from "./models/guild";
import {OptOut} from "./models/optOut";
import {PendingApplication} from "./models/pendingApllication";

const verificationSchema = new Schema({
    message: { type: String },
    endingMessage: { type: String },
    questions: { type: [String] },
    log: { type: String },
    approvers: { type: [String] },
    history: { type: String },
}, { _id: false });

const questioningSchema = new Schema({
    category: { type: String },
    log: { type: String },
}, { _id: false });

const guideSchema = new Schema({
    channel: { type: String },
    message: { type: String },
}, { _id: false });

const welcomeSchema = new Schema({
    channel: { type: String },
    message: { type: String },
    toggle: { type: Boolean },
}, { _id: false });

const rolesSchema = new Schema({
    memberRole: { type: String },
    unverifiedRole: { type: String },
    staffRoles: { type: [String] },
}, { _id: false });

const reasonSchema = new Schema({
    kick: { type: [String] },
    ban: { type: [String] },
}, { _id: false });

const userAppLogSchema = new Schema({
    enabled: { type: [Boolean] },
    channel: { type: [String] },
}, { _id: false });

const configSchema = new Schema({
    verification: { type: verificationSchema },
    questioning: { type: questioningSchema },
    guide: { type: guideSchema },
    welcome: { type: welcomeSchema },
    roles: { type: rolesSchema },
    reason: { type: reasonSchema },
    userAppLog: { type: userAppLogSchema }
}, { _id: false });

const guildSchema = new Schema<DatabaseGuild>({
    id: { type: String, required: true, unique: true },
    config: { type: configSchema }
});

const pendingApplicationSchema = new Schema<PendingApplication>({
    userId: { type: String, unique: true, required: true },
    requiredApprovers: { type: [String], required: true },
    guildId: { type: String, required: true },
    messageId: { type: String, unique: true, required: false },
    questioningChannelId: { type: String, unique: true, required: false },
    questions: { type: [String], required: true },
    answers: { type: [String], required: true },
    attempts: { type: Number, required: true },
    currentlyActive: { type: Number, required: false },
    currentStaffMember: { type: String, required: false },
});

const optOutSchema = new Schema<OptOut>({
    userId: { type: String, unique: true, required: true }
});

export default class Database {
    private static instance: Database | null = null;

    private config: DatabaseConfig;
    private GuildModel: Model<DatabaseGuild>;
    private readonly PendingApplicationModel: Model<PendingApplication>;
    private readonly OptOutModel: Model<OptOut>;

    private constructor(config: DatabaseConfig) {
        this.config = config;
        this.GuildModel = mongoose.model("Guild", guildSchema);
        this.PendingApplicationModel = mongoose.model("PendingApplication", pendingApplicationSchema);
        this.OptOutModel = mongoose.model("OptOut", optOutSchema);

        mongoose.set("strictQuery", false);

        this.startCleanupTask();
    }

    /**
     * Create or return an instance of the database
     * @param config The configuration params for creating a new Database object
     * @returns New or existing Database object
     */
    public static getInstance(config?: DatabaseConfig): Database {
        if (!this.instance) {
            if (!config) {
                throw new Error("You must provide the config in order to create a new instance")
            }
            this.instance = new Database(config);
        }

        return this.instance;
    }

    /**
     * Connect to database
     */
    public async connect(): Promise<void> {
        try {
            await mongoose.connect(this.config.url, { dbName: this.config.name });
            console.info("Connected to database");
        } catch (error) {
            console.error("Failed to connect to the database", error);
            throw error;
        }
    }

    /**
     * Disconnect from the database
     */
    public async disconnect(): Promise<void> {
        await mongoose.disconnect();
        container.logger.info("Disconnected from database");
    }

    /**
     * Clean currently active values from pending applications
     */
    private startCleanupTask(): void {
        setInterval(async () => {
            const threshold = Date.now() - 3 * 60 * 1000;

            try {
                await this.PendingApplicationModel.updateMany(
                    { currentlyActive: { $lte: threshold } },
                    { $unset: { currentlyActive: "", currentStaffMember: "" } },
                );
            } catch (error) {
                console.error("Failed to clean up expired currentlyActive fields:", error);
            }
        }, 30 * 1000);
    }

    /**
     * Return data for a specific guild if it's in the database, if it isn't, create one
     * @param id ID of the guild
     * @returns New or existing guild object
     */
    private async getGuild(id: string): Promise<DatabaseGuild | null> {
        return this.GuildModel.findOneAndUpdate({ id }, { $setOnInsert: { id } }, { new: true, upsert: true });
    }

    /**
     * Delete a guild
     * @param id ID of the guild
     */
    public async deleteGuild(id: string): Promise<void> {
        await this.GuildModel.findOneAndDelete({ id });
    }


    /**
     * Return data for a specific pending application by user ID
     * @param userId The user to search by
     * @param guildId ID of the guild
     * @returns Pending application or null
     */
    private async getPendingApplicationFromDb(userId: string, guildId: string): Promise<PendingApplication | null> {
        return this.PendingApplicationModel.findOne({ userId: userId, guildId: guildId });
    }

    /**
     * Return data for a specific pending application by user ID
     * @param guildId The guild to search by
     * @returns Pending application or null
     */
    private async getPendingApplicationByGuildId(guildId: string): Promise<PendingApplication[] | null> {
        return this.PendingApplicationModel.find({ guildId: guildId });
    }

    /**
     * Return data for a specific pending application by message ID
     * @param messageId The ID of the message
     * @returns Pending application or null
     */
    private async getPendingApplicationByMessageId(messageId: string): Promise<PendingApplication | null> {
        return this.PendingApplicationModel.findOne({ messageId: messageId });
    }

    /**
     * Return data for a specific pending application by message ID
     * @returns Pending application or null
     * @param questioningChannelId ID of the questioning channel
     */
    private async getPendingApplicationByQuestioningChannelId(questioningChannelId: string): Promise<PendingApplication | null> {
        return this.PendingApplicationModel.findOne({ questioningChannelId: questioningChannelId });
    }

    /**
     * Return whether a specific user is opted out of serverprotector
     * @param userId The ID of the user
     * @returns Whether the user is opted out or not
     */
    private async getOptOutByUser(userId: string): Promise<OptOut | null> {
        return this.OptOutModel.findOne({ userId: userId });
    }

    /**
     * Set a value in the database
     * @param guildId ID of the guild
     * @param databaseLocation Location of the object
     * @param value Value to be assigned
     * @param alreadySetMessage Error message for when a value is already set
     * @param successMessage Success message
     * @param errorMessage Eror message for if the value fails to be set
     * @returns Response indicating success or failure
     */
    private async setValue(guildId: string, databaseLocation: string, value: any, alreadySetMessage: string, successMessage: string, errorMessage: string): Promise<CustomResponse> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild." };
        }

        const currentValue = guild.get(databaseLocation);
        if (currentValue === value) {
            return { success: false, message: alreadySetMessage };
        }

        guild.set(databaseLocation, value);
        try {
            await guild.save();
            return { success: true, message: successMessage };
        } catch (error) {
            return { success: false, message: errorMessage };
        }
    }

    /**
     * Unset a value in the database
     * @param guildId ID of the guild
     * @param databaseLocation Location of the object
     * @param notSetMessage Error when message isn't set
     * @param successMessage Success message
     * @param errorMessage Eror message for if the value fails to be set
     * @returns Response indicating success or failure
     */
    private async unsetValue(guildId: string, databaseLocation: string, notSetMessage: string, successMessage: string, errorMessage: string): Promise<CustomResponse> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild." };
        }

        const currentValue = guild.get(databaseLocation);
        if (!currentValue) {
            return { success: false, message: notSetMessage };
        }

        guild.set(databaseLocation, undefined);
        try {
            await guild.save();
            return { success: true, message: successMessage };
        } catch (error) {
            return { success: false, message: errorMessage };
        }
    }

    /**
     * Add a value to an array in the database
     * @param guildId ID of the guild
     * @param databaseLocation Location of the object
     * @param value Value to be assigned
     * @param existsMessage Whether the message already exists
     * @param successMessage Success message
     * @param errorMessage Eror message for if the value fails to be set
     * @returns Response indicating success or failure
     */
    private async addToArray(guildId: string, databaseLocation: string, value: any, existsMessage: string, successMessage: string, errorMessage: string): Promise<CustomResponse> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild." };
        }

        const array = guild.get(databaseLocation) || [];
        if (array.includes(value)) {
            return { success: false, message: existsMessage };
        }

        array.push(value);
        guild.set(databaseLocation, array);
        try {
            await guild.save();
            return { success: true, message: successMessage };
        } catch (error) {
            return { success: false, message: errorMessage };
        }
    }

    /**
     * Remove a value from an array in the database by value or index
     * @param guildId ID of the guild
     * @param databaseLocation Location of the object
     * @param valueOrIndex Value to be removed or index of the value to be removed
     * @param isIndex Flag to indicate if the second parameter is an index
     * @param notExistsMessage Error message for when the value or index does not exist
     * @param successMessage Success message
     * @param errorMessage Error message for if the value fails to be removed
     * @returns Response indicating success or failure
     */
    private async removeFromArray(guildId: string, databaseLocation: string, valueOrIndex: any, isIndex: boolean, notExistsMessage: string, successMessage: string, errorMessage: string): Promise<CustomResponse> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild." };
        }

        const array = guild.get(databaseLocation) || [];
        let index: number;

        if (isIndex) {
            index = valueOrIndex;
            if (index < 0 || index >= array.length) {
                return { success: false, message: notExistsMessage };
            }
        } else {
            if (typeof valueOrIndex === 'object') {
                index = array.findIndex((element: any) => JSON.stringify(element) === JSON.stringify(valueOrIndex));
            } else {
                index = array.indexOf(valueOrIndex);
            }
            if (index === -1) {
                return { success: false, message: notExistsMessage };
            }
        }

        array.splice(index, 1);
        guild.set(databaseLocation, array);
        try {
            await guild.save();
            return { success: true, message: successMessage };
        } catch (error) {
            return { success: false, message: errorMessage };
        }
    }

    /**
     * Remove all values from an array in the database
     * @param guildId ID of the guild
     * @param databaseLocation Location of the object
     * @param successMessage Success message
     * @param errorMessage Error message if the operation fails
     * @returns Response indicating success or failure
     */
    private async removeAllFromArray(guildId: string, databaseLocation: string, successMessage: string, errorMessage: string): Promise<CustomResponse> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild." };
        }

        guild.set(databaseLocation, []);

        try {
            await guild.save();
            return { success: true, message: successMessage };
        } catch (error) {
            return { success: false, message: errorMessage };
        }
    }

    /**
     * Reposition a value in the database
     * @param guildId ID of the guild
     * @param databaseLocation Location of the object
     * @param oldIndex Old index of the element
     * @param newIndex New index of the element
     * @param successMessage Success message
     * @param errorMessage Eror message for if the value fails to be set
     * @returns Response indicating success or failure
     */
    private async repositionArrayItem(guildId: string, databaseLocation: string, oldIndex: number, newIndex: number, successMessage: string, errorMessage: string): Promise<CustomResponse> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild." };
        }

        const array = guild.get(databaseLocation) || [];
        if (oldIndex < 0 || oldIndex >= array.length || newIndex < 0 || newIndex >= array.length || oldIndex === newIndex) {
            return { success: false, message: "Invalid index." };
        }

        const [item] = array.splice(oldIndex, 1);
        array.splice(newIndex, 0, item);

        guild.set(databaseLocation, array);
        try {
            await guild.save();
            return { success: true, message: successMessage };
        } catch (error) {
            return { success: false, message: errorMessage };
        }
    }

    //Guild config table

    /**
     * Set the guide channel
     * @param guildId ID of the guild
     * @param channelId ID of the guide channel
     * @returns Response indicating success or failure
     */
    public setGuideChannel(guildId: string, channelId: string) {
        return this.setValue(guildId, "config.guide.channel", channelId,
            `The guide channel is already set to <#${channelId}>.`,
            `Successfully set the guide channel to <#${channelId}>.`,
            "Failed to set the guide channel.");
    }

    /**
     * Remove the guide channel
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeGuideChannel(guildId: string) {
        return this.unsetValue(guildId, "config.guide.channel",
            "The guide channel is not set.",
            "Successfully removed the guide channel.",
            "Failed to remove the guide channel.");
    }

    /**
     * Set the guide message
     * @param guildId ID of the guild
     * @param message The guide message
     * @returns Response indicating success or failure
     */
    public setGuideMessage(guildId: string, message: string) {
        return this.setValue(guildId, "config.guide.message", message,
            "The guide message is already set to that.",
            trimString(`Successfully set the guide message to:\n\n${message}`, 4000),
            "Failed to set the guide message.");
    }

    /**
     * Remove the guide message
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeGuideMessage(guildId: string) {
        return this.unsetValue(guildId, "config.guide.message",
            "The guide message is not set.",
            "Successfully removed the guide message.",
            "Failed to remove the guide message.");
    }

    /**
     * Set the verification message
     * @param guildId ID of the guild
     * @param message The verification message
     * @returns Response indicating success or failure
     */
    public setVerificationMessage(guildId: string, message: string) {
        return this.setValue(guildId, "config.verification.message", message,
            "The verification message is already set to that.",
            trimString(`Successfully set the verification message to:\n\n${message}`, 4000),
            "Failed to set the verification message.");
    }

    /**
     * Remove the verification message
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeVerificationMessage(guildId: string) {
        return this.unsetValue(guildId, "config.verification.message",
            "The verification message is not set.",
            "Successfully removed the verification message.",
            "Failed to remove the verification message.");
    }

    /**
     * Set the verification ending message
     * @param guildId ID of the guild
     * @param endingMessage The ending message
     * @returns Response indicating success or failure
     */
    public setVerificationEndingMessage(guildId: string, endingMessage: string) {
        return this.setValue(guildId, "config.verification.endingMessage", endingMessage,
            "The verification ending message is already set to that.",
            trimString(`Successfully set the verification ending message to:\n\n${endingMessage}`, 4000),
            "Failed to set the verification message.");
    }

    /**
     * Remove the verification ending message
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeVerificationEndingMessage(guildId: string) {
        return this.unsetValue(guildId, "config.verification.endingMessage",
            "The verification ending message is not set.",
            "Successfully removed the verification ending message.",
            "Failed to remove the verification message.");
    }

    /**
     * Add a verification question to the list
     * @param guildId ID of the guild
     * @param question Verification question to be added
     * @returns Response indicating success or failure
     */
    public addVerificationQuestion(guildId: string, question: string) {
        return this.addToArray(guildId, "config.verification.questions", question,
            "That verification question already exists.",
            `Successfully added "${question}" to the verification questions list.`,
            "Failed to add the verification question.");
    }

    /**
     * Remove a verification question from the list
     * @param guildId ID of the guild
     * @param questionIndex The index of the question
     * @returns Response indicating success or failure
     */
    public removeVerificationQuestion(guildId: string, questionIndex: number) {
        return this.removeFromArray(guildId, "config.verification.questions", questionIndex, true,
            "That verification question does not exist.",
            "Successfully removed the question from the verification questions list.",
            "Failed to remove the verification question.");
    }

    /**
     * Remove all verification questions from a guild
     * @param guildId The ID of the guild
     */
    public removeAllVerificationQuestions(guildId: string) {
        return this.removeAllFromArray(guildId, "config.verification.questions",
            "Successfully removed all verification questions.",
            "Failed to remove all verification questions.");
    }

    /**
     * Reposition a verification question in the list
     * @param guildId ID of the guild
     * @param oldIndex Current index of the verification question
     * @param newIndex New index of the verification question
     * @returns Response indicating success or failure
     */
    public repositionVerificationQuestion(guildId: string, oldIndex: number, newIndex: number) {
        return this.repositionArrayItem(guildId, "config.verification.questions", oldIndex, newIndex,
            "Successfully repositioned the verification question.",
            "Failed to reposition the verification question.");
    }

    /**
     * Set the verification log channel
     * @param guildId ID of the guild
     * @param channelId ID of the verification log channel
     * @returns Response indicating success or failure
     */
    public setVerificationLog(guildId: string, channelId: string) {
        return this.setValue(guildId, "config.verification.log", channelId,
            `The verification log is already set to <#${channelId}>.`,
            `Successfully set the verification log to <#${channelId}>.`,
            "Failed to set the verification log.");
    }

    /**
     * Remove the verification log channel
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeVerificationLog(guildId: string) {
        return this.unsetValue(guildId, "config.verification.log",
            "The verification log is not set.",
            "Successfully removed the verification log.",
            "Failed to remove the verification log.");
    }

    /**
     * Add an approver to the list
     * @param guildId ID of the guild
     * @param approver ID of the approver
     * @returns Response indicating success or failure
     */
    public addVerificationApprover(guildId: string, approver: string) {
        return this.addToArray(guildId, "config.verification.approvers", approver,
            "That approver already exists.",
            `Successfully added <@${approver}> to the verification approvers list.`,
            "Failed to add the verification question.");
    }

    /**
     * Remove an approver from the list
     * @param guildId ID of the guild
     * @param approver ID of the approver
     * @returns Response indicating success or failure
     */
    public removeVerificationApprover(guildId: string, approver: string) {
        return this.removeFromArray(guildId, "config.verification.approvers", approver, false,
            "That approver does not exist.",
            "Successfully removed the user from the verification approvers list.",
            "Failed to remove the verification question.");
    }

    /**
     * Set the verification history channel
     * @param guildId ID of the guild
     * @param channelId ID of the verification log channel
     * @returns Response indicating success or failure
     */
    public setVerificationHistory(guildId: string, channelId: string) {
        return this.setValue(guildId, "config.verification.history", channelId,
            `The verification history channel is already set to <#${channelId}>.`,
            `Successfully set the verification history channel to <#${channelId}>.`,
            "Failed to set the verification history channel.");
    }

    /**
     * Remove the verification history channel
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeVerificationHistory(guildId: string) {
        return this.unsetValue(guildId, "config.verification.history",
            "The verification history channel is not set.",
            "Successfully removed the verification history channel.",
            "Failed to remove the verification history channel.");
    }

    /**
     * Set the questioning category
     * @param guildId ID of the guild
     * @param categoryId ID of the questioning category
     * @returns Response indicating success or failure
     */
    public setQuestioningCategory(guildId: string, categoryId: string) {
        return this.setValue(guildId, "config.questioning.category", categoryId,
            `The questioning category is already set to <#${categoryId}>.`,
            `Successfully set the questioning category to <#${categoryId}>.`,
            "Failed to set the questioning category.");
    }

    /**
     * Remove the questioning category
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeQuestioningCategory(guildId: string) {
        return this.unsetValue(guildId, "config.questioning.category",
            "The questioning category is not set.",
            "Successfully removed the Questioning category.",
            "Failed to remove the questioning category.");
    }

    /**
     * Set the questioning log channel
     * @param guildId ID of the guild
     * @param channelId ID of the questioning log channel
     * @returns Response indicating success or failure
     */
    public setQuestioningLog(guildId: string, channelId: string) {
        return this.setValue(guildId, "config.questioning.log", channelId,
            `The questioning log is already set to <#${channelId}>.`,
            `Successfully set the questioning log to <#${channelId}>.`,
            "Failed to set the questioning log.");
    }

    /**
     * Remove the questioning log channel
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeQuestioningLog(guildId: string) {
        return this.unsetValue(guildId, "config.questioning.log",
            "The questioning log is not set.",
            "Successfully removed the questioning log.",
            "Failed to remove the questioning log.");
    }

    /**
     * Set the welcome channel
     * @param guildId ID of the guild
     * @param channelId ID of the welcome channel
     * @returns Response indicating success or failure
     */
    public setWelcomeChannel(guildId: string, channelId: string) {
        return this.setValue(guildId, "config.welcome.channel", channelId,
            `The welcome channel is already set to <#${channelId}>.`,
            `Successfully set the Welcome channel to <#${channelId}>.`,
            "Failed to set the welcome channel.");
    }

    /**
     * Remove the welcome channel
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeWelcomeChannel(guildId: string) {
        return this.unsetValue(guildId, "config.welcome.channel",
            "The welcome channel is not set.",
            "Successfully removed the Welcome channel.",
            "Failed to remove the welcome channel.");
    }

    /**
     * Set the welcome message
     * @param guildId ID of the guild
     * @param message Welcome message to be set
     * @returns Response indicating success or failure
     */
    public setWelcomeMessage(guildId: string, message: string) {
        return this.setValue(guildId, "config.welcome.message", message,
            "The welcome message is already set to that.",
            trimString(`Successfully set the welcome messageto to:\n\n${message}`, 4000),
            "Failed to set the welcome message.");
    }

    /**
     * Remove the welcome message
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeWelcomeMessage(guildId: string) {
        return this.unsetValue(guildId, "config.welcome.message",
            "The welcome message is not set.",
            "Successfully removed the welcome message.",
            "Failed to remove the welcome message.");
    }

    /**
     * Enable the welcome message
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public enableWelcomeToggle(guildId: string) {
        return this.setValue(guildId, "config.welcome.toggle", true,
            "The welcome toggle is already enabled.",
            "Successfully enabled the welcome toggle.",
            "Failed to enable the welcome toggle.");
    }

    /**
     * Disable the welcome message
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public disableWelcomeToggle(guildId: string) {
        return this.setValue(guildId, "config.welcome.toggle", false,
            "The welcome toggle is already disabled.",
            "Successfully disabled the welcome toggle.",
            "Failed to disable the welcome toggle.");
    }

    /**
     * Set the member role
     * @param guildId ID of the guild
     * @param roleId ID of the member role
     * @returns Response indicating success or failure
     */
    public setMemberRole(guildId: string, roleId: string) {
        return this.setValue(guildId, "config.roles.memberRole", roleId,
            `The member role is already set to <@&${roleId}>`,
            `Successfully set the member role to <@&${roleId}>`,
            "Failed to set the member role.");
    }

    /**
     * Remove the member role
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeMemberRole(guildId: string) {
        return this.unsetValue(guildId, "config.roles.memberRole",
            "The member role is not set.",
            "Successfully removed the member role.",
            "Failed to remove the member role.");
    }

    /**
     * Set the unverified role
     * @param guildId ID of the guild
     * @param roleId ID of the unverified role
     * @returns Response indicating success or failure
     */
    public setUnverifiedRole(guildId: string, roleId: string) {
        return this.setValue(guildId, "config.roles.unverifiedRole", roleId,
            `The unverified role is already set to <@&${roleId}>.`,
            `Successfully set the unverified role to <@&${roleId}>.`,
            "Failed to set the unverified role.");
    }

    /**
     * Remove the unverified role
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeUnverifiedRole(guildId: string) {
        return this.unsetValue(guildId, "config.roles.unverifiedRole",
            "The unverified role is not set.",
            "Successfully removed the unverified role.",
            "Failed to remove the unverified role.");
    }

    /**
     * Add a staff role to the list
     * @param guildId ID of the guild
     * @param roleId ID of the role
     * @returns Response indicating success or failure
     */
    public addStaffRole(guildId: string, roleId: string): Promise<CustomResponse> {
        return this.addToArray(guildId, "config.roles.staffRoles", roleId,
            "The staff role already exists",
            `Successfully added <@&${roleId}> to the staff roles list.`,
            "Failed to add the staff role.");
    }

    /**
     * Remove a staff role from the list
     * @param guildId ID of the guild
     * @param roleId ID of the role
     * @returns Response indicating success or failure
     */
    public removeStaffRole(guildId: string, roleId: string): Promise<CustomResponse> {
        return this.removeFromArray(guildId, "config.roles.staffRoles", roleId, false,
            "The staff role does not exist.",
            `Successfully removed <@&${roleId}> from the staff roles list`,
            "Failed to remove the staff role.");
    }

    /**
     * Add a kick reason to the list
     * @param guildId ID of the guild
     * @param reason Kick reason to be added
     * @returns Response indicating success or failure
     */
    public addKickReason(guildId: string, reason: string) {
        return this.addToArray(guildId, "config.reason.kick", reason,
            "That kick reason already exists.",
            `Successfully added "${reason}" to the kick reasons list.`,
            "Failed to add the kick reason.");
    }

    /**
     * Remove a kick reason from the list
     * @param guildId ID of the guild
     * @param questionIndex Index of the reason
     * @returns Response indicating success or failure
     */
    public removeKickReason(guildId: string, questionIndex: number) {
        return this.removeFromArray(guildId, "config.reason.kick", questionIndex, true,
            "That kick reason does not exist.",
            "Successfully removed the kick reason from the kick reasons list.",
            "Failed to remove the kick reason.");
    }

    /**
     * Add a ban reason to the list
     * @param guildId ID of the guild
     * @param reason Ban reason to be added
     * @returns Response indicating success or failure
     */
    public addBanReason(guildId: string, reason: string) {
        return this.addToArray(guildId, "config.reason.ban", reason,
            "That ban reason already exists.",
            `Successfully added "${reason}" to the ban reasons list.`,
            "Failed to add the ban reason.");
    }

    /**
     * Remove a ban reason from the list
     * @param guildId ID of the guild
     * @param questionIndex Index of the reason
     * @returns Response indicating success or failure
     */
    public removeBanReason(guildId: string, questionIndex: number) {
        return this.removeFromArray(guildId, "config.reason.ban", questionIndex, true,
            "That ban reason does not exist.",
            "Successfully removed the ban reason from the ban reasons list.",
            "Failed to remove the ban reason.");
    }

    /**
     * Enable logging user apps usage
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public enableUserAppLog(guildId: string) {
        return this.setValue(guildId, "config.userAppLog.enabled", true,
            "User application logging is already enabled.",
            "Successfully enabled user application logging.",
            "Failed to enable user application logging."
        );
    }

    /**
     * Disable logging user apps usage
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public disableUserAppLog(guildId: string) {
        return this.setValue(guildId, "config.userAppLog.enabled", false,
            "User application logging is already disabled.",
            "Successfully disabled user application logging.",
            "Failed to disable user application logging."
        );
    }

    /**
     * Set the channel to log user app usage in
     * @param guildId ID of the guild
     * @param channelId ID of the channel
     * @returns Response indicating success or failure
     */
    public setUserAppLogChannel(guildId: string, channelId: string) {
        return this.setValue(
            guildId, "config.userAppLog.channel", channelId,
            `User application logging channel is already set to <#${channelId}>.`,
            `Successfully set the user application logging channel to <#${channelId}>.`,
            "Failed to set the user application logging channel."
        );
    }

    /**
     * Remove the channel to log user app usage in
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeUserAppLogChannel(guildId: string) {
        return this.unsetValue(
            guildId,
            "config.userAppLog.channel",
            "User application logging channel is not set.",
            "Successfully removed the user application logging channel.",
            "Failed to remove the user application logging channel."
        );
    }

    /**
     * Get the guide channel for a specified guild
     * @param guild The guild to search in
     * @returns The channel if found or nothing
     */
    public async getGuideChannel(guild: Guild): Promise<TextChannel | null> {
        const dbGuild = await this.getGuild(guild.id);
        const guideChannel = dbGuild?.config?.guide?.channel;
        if (!guideChannel) {
            return null;
        }

        const channel = await fetchChannelFromGuild(guild, guideChannel);
        if (!channel) {
            await this.removeGuideChannel(guideChannel);
            return null;
        }

        if (channel.type !== ChannelType.GuildText) {
            await this.removeGuideChannel(guideChannel);
            return null;
        }

        return channel;
    }

    /**
     * Get the guide message for a specified guild
     * @param guild The guild to search in
     * @returns The string if found or nothing
     */
    public async getGuideMessage(guild: Guild): Promise<string | null> {
        const dbGuild = await this.getGuild(guild.id);
        const guideMessage = dbGuild?.config?.guide?.message;
        if (!guideMessage) {
            return null;
        }

        return guideMessage;
    }

    /**
     * Get the verification message for a specified guild
     * @param guild The guild to search in
     * @returns The string if found or nothing
     */
    public async getVerificationMessage(guild: Guild): Promise<string | null> {
        const dbGuild = await this.getGuild(guild.id);
        const verificationMessage = dbGuild?.config?.verification?.message;
        if (!verificationMessage) {
            return null;
        }

        return verificationMessage;
    }

    /**
     * Get the verification message for a specified guild
     * @param guild The guild to search in
     * @returns The string if found or nothing
     */
    public async getVerificationEndingMessage(guild: Guild): Promise<string | null> {
        const dbGuild = await this.getGuild(guild.id);
        const verificationEndingMessage = dbGuild?.config?.verification?.endingMessage;
        if (!verificationEndingMessage) {
            return null;
        }

        return verificationEndingMessage;
    }

    /**
     * Get the verification questions for a specified guild
     * @param guild The guild to search in
     * @returns The array of strings if found or nothing
     */
    public async getVerificationQuestions(guild: Guild): Promise<string[] | null> {
        const dbGuild = await this.getGuild(guild.id);
        const verificationQuestions = dbGuild?.config?.verification?.questions;
        if (!verificationQuestions) {
            return null;
        }

        return verificationQuestions;
    }

    /**
     * Get the verification log channel for a specified guild
     * @param guild The guild to search in
     * @returns The channel if found or nothing
     */
    public async getVerificationLog(guild: Guild): Promise<TextChannel | null> {
        const dbGuild = await this.getGuild(guild.id);
        const verificationLog = dbGuild?.config?.verification?.log;
        if (!verificationLog) {
            return null;
        }

        const channel = await fetchChannelFromGuild(guild, verificationLog);
        if (!channel) {
            await this.removeVerificationLog(verificationLog);
            return null;
        }

        if (channel.type !== ChannelType.GuildText) {
            await this.removeVerificationLog(verificationLog);
            return null;
        }

        return channel;
    }

    /**
     * Get the list of verification approvers for a specified guild
     * @param guild The guild to search in
     * @returns The list of approvers if found or nothing
     */
    public async getVerificationApprovers(guild: Guild): Promise<GuildMember[] | null> {
        const dbGuild = await this.getGuild(guild.id);
        const approvers = dbGuild?.config?.verification?.approvers;
        if (!approvers) {
            return null;
        }

        const approverList = [];
        for (const approverId of approvers) {
            const member = await fetchMember(guild, approverId);
            if (!member) {
                continue;
            }
            approverList.push(member);
        }

        if (approverList.length === 0) {
            return null;
        }

        return approverList;
    }

    /**
     * Get the questioning category for a specified guild
     * @param guild The guild to search in
     * @returns The category if found or nothing
     */
    public async getQuestioningCategory(guild: Guild): Promise<CategoryChannel | null> {
        const dbGuild = await this.getGuild(guild.id);
        const questioningCategory = dbGuild?.config?.questioning?.category;
        if (!questioningCategory) {
            return null;
        }

        const channel = await fetchChannelFromGuild(guild, questioningCategory);
        if (!channel) {
            await this.removeQuestioningCategory(questioningCategory);
            return null;
        }

        if (channel.type !== ChannelType.GuildCategory) {
            await this.removeQuestioningCategory(questioningCategory);
            return null;
        }

        return channel;
    }

    /**
     * Get the verification history channel for a specified guild
     * @param guild The guild to search in
     * @returns The channel if found or nothing
     */
    public async getVerificationHistory(guild: Guild): Promise<TextChannel | null> {
        const dbGuild = await this.getGuild(guild.id);
        const verificationHistory = dbGuild?.config?.verification?.history;
        if (!verificationHistory) {
            return null;
        }

        const channel = await fetchChannelFromGuild(guild, verificationHistory);
        if (!channel) {
            await this.removeVerificationHistory(verificationHistory);
            return null;
        }

        if (channel.type !== ChannelType.GuildText) {
            await this.removeVerificationHistory(verificationHistory);
            return null;
        }

        return channel;
    }

    /**
     * Get the questioning log channel for a specified guild
     * @param guild The guild to search in
     * @returns The channel if found or nothing
     */
    public async getQuestioningLog(guild: Guild): Promise<TextChannel | null> {
        const dbGuild = await this.getGuild(guild.id);
        const questioningLog = dbGuild?.config?.questioning?.log;
        if (!questioningLog) {
            return null;
        }

        const channel = await fetchChannelFromGuild(guild, questioningLog);
        if (!channel) {
            await this.removeQuestioningLog(questioningLog);
            return null;
        }

        if (channel.type !== ChannelType.GuildText) {
            await this.removeQuestioningLog(questioningLog);
            return null;
        }

        return channel;
    }

    /**
     * Get the welcome channel for a specified guild
     * @param guild The guild to search in
     * @returns The channel if found or nothing
     */
    public async getWelcomeChannel(guild: Guild): Promise<TextChannel | null> {
        const dbGuild = await this.getGuild(guild.id);
        const welcomeChannel = dbGuild?.config?.welcome?.channel;
        if (!welcomeChannel) {
            return null;
        }

        const channel = await fetchChannelFromGuild(guild, welcomeChannel);
        if (!channel) {
            await this.removeWelcomeChannel(welcomeChannel);
            return null;
        }

        if (channel.type !== ChannelType.GuildText) {
            await this.removeWelcomeChannel(welcomeChannel);
            return null;
        }

        return channel;
    }

    /**
     * Get the welcome message for a specified guild
     * @param guild The guild to search in
     * @returns The string if found or nothing
     */
    public async getWelcomeMessage(guild: Guild): Promise<string | null> {
        const dbGuild = await this.getGuild(guild.id);
        const welcomeMessage = dbGuild?.config?.welcome?.message;
        if (!welcomeMessage) {
            return null;
        }

        return welcomeMessage;
    }

    /**
     * Get the welcome toggle for a specified guild
     * @param guild The guild to search in
     * @returns The boolean if found or false
     */
    public async getWelcomeToggle(guild: Guild): Promise<Boolean | null> {
        const dbGuild = await this.getGuild(guild.id);
        const welcomeToggle = dbGuild?.config?.welcome?.toggle;
        if (!welcomeToggle) {
            return false;
        }

        return welcomeToggle;
    }

    /**
     * Get the member role for a specified guild
     * @param guild The guild to search in
     * @returns The role if found or nothing
     */
    public async getMemberRole(guild: Guild): Promise<Role | null> {
        const dbGuild = await this.getGuild(guild.id);
        const memberRole = dbGuild?.config?.roles?.memberRole;
        if (!memberRole) {
            return null;
        }

        const role = await fetchRole(guild, memberRole);
        if (!role) {
            await this.removeMemberRole(memberRole);
            return null;
        }

        return role;
    }

    /**
     * Get the unverified role for a specified guild
     * @param guild The guild to search in
     * @returns The role if found or nothing
     */
    public async getUnverifiedRole(guild: Guild): Promise<Role | null> {
        const dbGuild = await this.getGuild(guild.id);
        const unverifiedRole = dbGuild?.config?.roles?.unverifiedRole;
        if (!unverifiedRole) {
            return null;
        }

        const role = await fetchRole(guild, unverifiedRole);
        if (!role) {
            await this.removeUnverifiedRole(unverifiedRole);
            return null;
        }

        return role;
    }

    /**
     * Get the list of staff roles for a specified guild
     * @param guild The guild to search in
     * @returns The list of roles if found or nothing
     */
    public async getStaffRoles(guild: Guild): Promise<Role[] | null> {
        const dbGuild = await this.getGuild(guild.id);
        const staffRoles = dbGuild?.config?.roles?.staffRoles;
        if (!staffRoles) {
            return null;
        }

        const roleList = [];
        for (const staffRole of staffRoles) {
            const role = await fetchRole(guild, staffRole);
            if (!role) {
                await this.removeStaffRole(guild.id, staffRole);
                continue;
            }

            roleList.push(role);
        }

        if (roleList.length === 0) {
            return null;
        }

        return roleList;
    }

    /**
     * Get the kick reasons for a specified guild
     * @param guild The guild to search in
     * @returns The array of strings if found or nothing
     */
    public async getKickReasons(guild: Guild): Promise<string[] | null> {
        const dbGuild = await this.getGuild(guild.id);
        const kickReasons = dbGuild?.config?.reason?.kick;
        if (!kickReasons) {
            return null;
        }

        return kickReasons;
    }

    /**
     * Get the ban reasons for a specified guild
     * @param guild The guild to search in
     * @returns The array of strings if found or nothing
     */
    public async getBanReasons(guild: Guild): Promise<string[] | null> {
        const dbGuild = await this.getGuild(guild.id);
        const banReasons = dbGuild?.config?.reason?.ban;
        if (!banReasons) {
            return null;
        }

        return banReasons;
    }

    /**
     * Get whether the logging user apps feature is enabled or disabled
     * @param guild The guild to search in
     * @returns True if enabled and false if disabled or not set
     */
    public async getUserAppLogToggle(guild: Guild): Promise<boolean> {
        const dbGuild = await this.getGuild(guild.id);
        return dbGuild?.config?.userAppLog?.enabled || false;
    }

    /**
     * Get the channel for logging user app usage in
     * @param guild The guild to search in
     * @returns The channel if found or nothing
     */
    public async getUserAppLogChannel(guild: Guild): Promise<TextChannel | null> {
        const dbGuild = await this.getGuild(guild.id);
        const userAppLogChannel = dbGuild?.config?.userAppLog?.channel;

        if (!userAppLogChannel) {
            return null;
        }

        const channel = await fetchChannelFromGuild(guild, userAppLogChannel);
        if (!channel || channel.type !== ChannelType.GuildText) {
            await this.removeUserAppLogChannel(guild.id);
            return null;
        }

        return channel;
    }


    //Pending application table

    /**
     * Add a pending application to the list
     * @param pendingApplication The pending application object
     * @returns Response indicating success or failure
     */
    public async addPendingApplication(pendingApplication: PendingApplication): Promise<CustomResponse> {
        try {
            const existingApplication = await this.getPendingApplicationFromDb(pendingApplication.userId, pendingApplication.guildId);
            if (existingApplication) {
                return { success: false, message: "The pending application already exists." };
            }

            const newApplication = new this.PendingApplicationModel(pendingApplication);

            await newApplication.save();
            return { success: true, message: `Successfully added <@${pendingApplication.userId}> to the pending applications list.` };
        } catch (error) {
            return { success: false, message: "Failed to add the pending application." };
        }
    }

    /**
     * Remove a pending application from the list
     * @param guildId ID of the guild
     * @param userId ID of the user whose application is to be removed
     * @returns Response indicating success or failure
     */
    public async removePendingApplication(userId: string, guildId: string): Promise<CustomResponse> {
        try {
            const result = await this.PendingApplicationModel.findOneAndDelete({ userId: userId, guildId: guildId });

            if (!result) {
                return { success: false, message: "Pending application does not exist." };
            }

            return { success: true, message: "Successfully removed the user from the pending applications list." };
        } catch (error) {
            return { success: false, message: "Failed to remove the pending application." };
        }
    }

    /**
     * Set the questions for a pending application
     * @param userId ID of the user whose application is being updated
     * @param guildId ID of the guild associated with the pending application
     * @param questions Array of new questions to be set
     * @returns Response indicating success or failure
     */
    public async setPendingApplicationQuestions(userId: string, guildId: string, questions: string[]): Promise<CustomResponse> {
        try {
            const pendingApplication = await this.getPendingApplicationFromDb(userId, guildId) as Document | null;

            if (!pendingApplication) {
                return { success: false, message: "Pending application does not exist." };
            }

            pendingApplication.set("questions", questions);

            await pendingApplication.save();
            return { success: true, message: `Successfully updated questions for <@${userId}> in the pending application.` };
        } catch (error) {
            return { success: false, message: "Failed to update the questions in the pending application." };
        }
    }

    /**
     * Set the answers for a pending application
     * @param userId The user ID of the pending application
     * @param guildId The guild ID of the pending application
     * @param answers The array of answers to set
     * @returns Response indicating success or failure
     */
    public async setPendingApplicationAnswers(userId: string, guildId: string, answers: string[]): Promise<CustomResponse> {
        try {
            const pendingApplication = await this.getPendingApplicationFromDb(userId, guildId) as Document | null;

            if (!pendingApplication) {
                return { success: false, message: "Pending application not found." };
            }

            pendingApplication.set("answers", answers);

            await pendingApplication.save();
            return { success: true, message: "Successfully updated the answers for the pending application." };
        } catch (error) {
            return { success: false, message: "Failed to update the answers for the pending application." };
        }
    }

    /**
     * Set the message ID for a pending application
     * @param userId The user ID of the pending application
     * @param guildId The guild ID of the pending application
     * @param messageId The ID of the message
     * @returns Response indication success or failure
     */
    public async setPendingApplicationMessageId(userId: string, guildId: string, messageId: string): Promise<CustomResponse> {
        try {
            const pendingApplication = await this.getPendingApplicationFromDb(userId, guildId) as Document | null;

            if (!pendingApplication) {
                return { success: false, message: "Pending application does not exist." };
            }

            pendingApplication.set("messageId", messageId);

            await pendingApplication.save();
            return { success: true, message: `Successfully updated message ID for <@${userId}> in the pending application.` };
        } catch (error) {
            return { success: false, message: "Failed to update the message ID in the pending application." };
        }
    }

    /**
     * Set the questioning channel ID for a pending application
     * @param userId The user ID of the pending application
     * @param guildId The guild ID of the pending application
     * @param questioningChannelId The ID of the questioning channel
     * @returns Response indication success or failure
     */
    public async setPendingApplicationQuestioningChannelId(userId: string, guildId: string, questioningChannelId: string): Promise<CustomResponse> {
        try {
            const pendingApplication = await this.getPendingApplicationFromDb(userId, guildId) as Document | null;

            if (!pendingApplication) {
                return { success: false, message: "Pending application does not exist." };
            }

            pendingApplication.set("questioningChannelId", questioningChannelId);

            await pendingApplication.save();
            return { success: true, message: `Successfully updated questioning channel ID for <@${userId}> in the pending application.` };
        } catch (error) {
            return { success: false, message: "Failed to update the questioning channel ID in the pending application." };
        }
    }

    /**
     * Set the currently active time when someone started a kick or ban process
     * @param userId The ID of the pending application user
     * @param guildId The ID of the guild
     */
    public async setPendingApplicationCurrentlyActive(userId: string, guildId: string): Promise<CustomResponse> {
        try {
            const pendingApplication = await this.getPendingApplicationFromDb(userId, guildId) as Document | null;

            if (!pendingApplication) {
                return { success: false, message: "Pending application does not exist." };
            }

            pendingApplication.set("currentlyActive", Date.now());

            await pendingApplication.save();
            console.log("Successfully updated the currently active time for the pending application.");
            return { success: true, message: `Successfully updated currently active for <@${userId}> in the pending application.` };
        } catch (error) {
            return { success: false, message: "Failed to update the currently active field in the pending application." };
        }
    }

    /**
     * Set the staff member that's currently handling a kick or a ban
     * @param userId The ID of the user of the pending application
     * @param guildId The ID of the guild
     * @param staffMemberId The ID of the staff member
     */
    public async setPendingApplicationCurrentStaffMember(userId: string, guildId: string, staffMemberId: string): Promise<CustomResponse> {
        try {
            const pendingApplication = await this.getPendingApplicationFromDb(userId, guildId) as Document | null;

            if (!pendingApplication) {
                return { success: false, message: "Pending application does not exist." };
            }

            pendingApplication.set("currentStaffMember", staffMemberId);

            await pendingApplication.save();
            console.log("Successfully updated the current staff member for the pending application.");
            return { success: true, message: `Successfully updated current staff member for <@${userId}> in the pending application.` };
        } catch (error) {
            return { success: false, message: "Failed to update the current staff member field in the pending application." };
        }
    }

    /**
     * Add to the attempts counter for a pending application
     * @param userId The user ID of the pending application
     * @param guildId The guild ID of the pending application
     * @returns Response indication success or failure
     */
    public async increasePendingApplicationAttempts(userId: string, guildId: string): Promise<CustomResponse> {
        try {
            const pendingApplication = await this.getPendingApplicationFromDb(userId, guildId) as Document | null;

            if (!pendingApplication) {
                return { success: false, message: "Pending application does not exist." };
            }

            pendingApplication.set("attempts", pendingApplication.get("attempts") + 1);

            await pendingApplication.save();
            return { success: true, message: `Successfully updated message ID for <@${userId}> in the pending application.` };
        } catch (error) {
            return { success: false, message: "Failed to update the message ID in the pending application." };
        }
    }

    /**
     * Remove a specified approver from the required approvers of a pending application
     * @param userId The user ID of the pending application
     * @param guildId The guild ID of the pending application
     * @param approverId The ID of the approver to remove
     * @returns Response indicating success or failure
     */
    public async removePendingApplicationApprover(userId: string, guildId: string, approverId: string): Promise<CustomResponse> {
        try {
            const pendingApplication = await this.getPendingApplicationFromDb(userId, guildId) as Document | null;

            if (!pendingApplication) {
                return { success: false, message: "Pending application not found." };
            }

            // Remove the specified approver if they exist in the array
            const updatedApprovers = pendingApplication.get("requiredApprovers").filter((id: string) => id !== approverId);
            pendingApplication.set("requiredApprovers", updatedApprovers);

            await pendingApplication.save();
            return { success: true, message: "Successfully removed the approver from the pending application." };
        } catch (error) {
            return { success: false, message: "Failed to remove the approver from the pending application." };
        }
    }

    /**
     * Get the list of pending application members for a specified guild
     * @param guild The guild to search in
     * @returns The list of members if found or nothing
     */
    public async getPendingApplications(guild: Guild): Promise<PendingApplication[] | null> {
        const pendingApplications = await this.getPendingApplicationByGuildId(guild.id);
        if (!pendingApplications) {
            return null;
        }

        const pendingApplicationList = [];
        for (const pendingApplication of pendingApplications) {
            if (!pendingApplication.userId) {
                await this.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
                continue;
            }

            const member = await fetchMember(guild, pendingApplication.userId);
            if (!member) {
                await this.removePendingApplication(pendingApplication.userId, pendingApplication.guildId);
                continue;
            }

            pendingApplicationList.push(pendingApplication);
        }

        if (pendingApplicationList.length === 0) {
            return null;
        }

        return pendingApplicationList;
    }

    /**
     * Get a pending application by the user ID and the guild ID
     * @param userId The ID of the user
     * @param guildId The ID of the guild
     * @returns Pending application if it exists
     */
    public async getPendingApplication(userId: string, guildId: string): Promise<PendingApplication | null> {
        return await this.getPendingApplicationFromDb(userId, guildId);
    }

    /**
     * Get a pending application by the message ID
     * @param messageId The ID of the message
     * @returns Pending application if it exists
     */
    public async getPendingApplicationFromMessage(messageId: string): Promise<PendingApplication | null> {
        return await this.getPendingApplicationByMessageId(messageId);
    }

    /**
     * Get a pending application by the questioning channel ID
     * @returns Pending application if it exists
     * @param questioningChannelId The ID of the pending application
     */
    public async getPendingApplicationFromQuestioningChannel(questioningChannelId: string): Promise<PendingApplication | null> {
        return await this.getPendingApplicationByQuestioningChannelId(questioningChannelId);
    }

    //Optout table

    /**
     * Add a user to the opt-out list
     * @param userId ID of the user to opt-out
     * @returns Response indicating success or failure
     */
    public async addOptOut(userId: string): Promise<CustomResponse> {
        try {
            const existingOptOut = await this.OptOutModel.findOne({ userId });
            if (existingOptOut) {
                return { success: false, message: "The user is already opted out." };
            }

            const newOptOut = new this.OptOutModel({ userId });
            await newOptOut.save();
            return { success: true, message: `Successfully added <@${userId}> to the opt-out list.` };
        } catch (error) {
            console.error(error);
            return { success: false, message: "Failed to add the user to the opt-out list." };
        }
    }

    /**
     * Remove a user from the opt-out list
     * @param userId ID of the user whose opt-out status is to be removed
     * @returns Response indicating success or failure
     */
    public async removeOptOut(userId: string): Promise<CustomResponse> {
        try {
            const existingOptOut = await this.OptOutModel.findOne({ userId });
            if (!existingOptOut) {
                return { success: false, message: "Opt-out record does not exist." };
            }

            await this.OptOutModel.deleteOne({ userId });
            return { success: true, message: "Successfully removed the user from the opt-out list." };
        } catch (error) {
            console.error(error);
            return { success: false, message: "Failed to remove the user from the opt-out list." };
        }
    }

    /**
     * Get whether a user is opted out or not
     * @param userId ID of the user
     * @returns Whether the user is opted out
     */
    public async getOptOut(userId: string): Promise<boolean> {
        const optOut = await this.getOptOutByUser(userId);

        return !!optOut;
    }
}