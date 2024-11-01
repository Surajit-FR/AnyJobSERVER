import { Document, ObjectId } from "mongoose";

export interface IUser extends Document {
    _id: string | ObjectId;
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dob: Date;
    oldPassword: string;
    password: string;
    avatar: string;
    coverImage: string;
    isVerified: boolean;
    userType: string;
    refreshToken?: string;
    isPasswordCorrect(password: string): Promise<boolean>;
    generateAccessToken(): string;
    generateRefreshToken(): string;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};

export interface IAdditionalUserInfo extends Document {
    _id: string | ObjectId;
    userId: ObjectId;
    companyName: string;
    companyIntroduction: string;
    DOB: Date;
    driverLicense: string;
    driverLicenseImage: string;
    EIN: string;
    socialSecurity: string;
    companyLicense: string;
    companyLicenseImage: string;
    insurancePolicy: number;
    licenseProofImage: string;
    businessLicenseImage: string;
    businessImage: string;
    businessName: string;
    isReadAggrement: boolean;
    isAnyArrivalFee?: boolean;
    arrivalFee: number;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};

export interface IAddressType extends Document {
    _id: string | ObjectId;
    userId: ObjectId;
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: number;
    apartmentNumber?: string;
    landmark?: string;
    latitude: number;
    longitude: number;
    isPrimary?: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export interface ICategorySchema extends Document {
    _id: ObjectId;
    name: string;
    categoryImage: string;
    owner: ObjectId;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};

export interface ISubCategorySchema extends Document {
    _id: ObjectId;
    categoryId: ObjectId;
    name: string;
    subCategoryImage: string;
    questionArray: Array<any>;
    owner: ObjectId;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};

export interface IServiceSchema extends Document {
    _id: ObjectId;
    categoryId: ObjectId;
    subCategoryId: ObjectId;
    serviceStartDate: Date;
    serviceShifftId: ObjectId;
    SelectedShiftTime: object;
    serviceZipCode: number;
    serviceLatitude: number;
    serviceLongitude: number;
    isIncentiveGiven: boolean;
    incentiveAmount: number;
    isTipGiven: boolean;
    tipAmount: number;
    isApproved: string;
    isReqAcceptedByServiceProvider: boolean;
    serviceProviderId: ObjectId;
    serviceProductImage: string;
    otherInfo: object;
    userId: ObjectId;
    answerArray: Array<any>;
    requestProgress: string;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};

export interface IDerivedQuestion {
    option: string;
    question: string;
    options: Map<string, string>;
    derivedQuestions: IDerivedQuestion[];
};

export interface IQuestion {
    map(arg0: (questionData: IQuestion) => Promise<import("mongoose").Types.ObjectId>): any;
    categoryId: mongoose.Types.ObjectId;
    subCategoryId: mongoose.Types.ObjectId;
    question: string;
    options: Map<string, string>;
    derivedQuestions: IDerivedQuestion[]; // Derived questions are stored here
    isDeleted: boolean,
    createdAt?: Date;
    updatedAt?: Date;

};

// Interface for Derived Answer
interface IDerivedAnswer extends Document {
    option: string;
    answer: string;
    derivedAnswers: IDerivedAnswer[];
}

// Interface for Answer
interface IAnswer extends Document {
    answer: string;
    selectedOption: string;
    derivedAnswers: IDerivedAnswer[];
}

export interface IShiftTimeSchema extends Document {
    _id: ObjectId;
    startTime: string;
    endTime: string;
};

export interface IShiftSchema extends Document {
    _id: ObjectId;
    shiftName: string;
    shiftTimes: IShiftTimeSchema[];
    createdBy: ObjectId;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};

export interface IOTPSchema extends Document {
    _id: ObjectId;
    userId: ObjectId;
    phoneNumber: string;
    otp: string;
    secret: string;
    createdAt?: Date;
    expiredAt: Date;
    updatedAt?: Date;
};

export interface IRatingSchema extends Document {
    _id: ObjectId;
    ratedBy: ObjectId;
    ratedTo: ObjectId;
    rating: number;
    comments: string;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};
export interface ITeamSchema extends Document {
    _id: ObjectId;
    serviceProviderId: ObjectId;
    fieldAgentIds: Array;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};