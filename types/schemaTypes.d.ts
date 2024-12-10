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
    driverLicense:string;
    driverLicenseImages:  Array<string>;
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
    location: string;
    addressType: string;
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    apartmentNumber?: string;
    landmark?: string;
    latitude: string;
    longitude: string;
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

export interface IGeoJSONPoint {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
}

export interface IServiceSchema extends Document {
    _id: ObjectId;
    categoryId: ObjectId;
    serviceStartDate: Date;
    serviceShifftId: ObjectId;
    SelectedShiftTime: object;
    serviceProductImage: string;
    serviceZipCode: string;
    serviceLatitude: string;
    serviceLongitude: string;
    location: IGeoJSONPoint;
    startedAt: Date;
    completedAt: Date;
    isIncentiveGiven: boolean;
    incentiveAmount: number;
    isTipGiven: boolean;
    tipAmount: number;
    isApproved: string;
    isReqAcceptedByServiceProvider: boolean;
    serviceProviderId: ObjectId;
    assignedAgentId: ObjectId;
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
    email: string;
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

export interface IPermissionSchema extends Document {
    _id: ObjectId;
    userId: ObjectId;
    acceptRequest: boolean;
    assignJob: boolean;
    fieldAgentManagement: boolean;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};

export interface IIPLogSchema extends Document {
    _id: ObjectId;
    ipAddress: string;
    ipType: "IPv4" | "IPv6" | "Unknown";
    route: string;
    method: string;
    protocol: string;
    hostname: string;
    queryParams: Record<string, any>; // Stores query parameters as a key-value object
    headers: {
        contentType?: string;
        userAgent?: string;
    };
    referer: string;
    userId: string;
    userType: string;
    timestamp: Date;
}