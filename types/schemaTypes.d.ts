import { Document, ObjectId } from "mongoose";

export interface IUser extends Document {
    _id: string | ObjectId;
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: number;
    dob: Date;
    oldPassword:string;
    password: string;
    avatar: string;
    coverImage:string;
    addressId:ObjectId;
    additionalInfoId:ObjectId;
    isVerified:boolean;
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
    userId:ObjectId;
    companyName: string;
    companyIntroduction: string;
    DOB:Date;
    driverLicense: string;
    driverLicenseImage: string;
    EIN: string;
    socialSecurity:string;
    companyLicense: string;
    companyLicenseImage: string;
    insurancePolicy:number;
    licenseProofImage:string;
    businessLicenseImage:string;
    businessImage:string;
    businessName: string;
    isReadAggrement: boolean;
    isAnyArrivalFee?:boolean;
    arrivalFee:number;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};

export interface IAddressType extends Document {
    _id: string | ObjectId;
    userId:ObjectId;
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
    isApproved: string;
    isReqAcceptedByServiceProvider:boolean;
    serviceProviderId:ObjectId;
    serviceProductImage: string;
    otherInfo: object;
    userId: ObjectId;
    answerArray: Array<any>;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};

export interface IQuestionSchema extends Document {
    _id: ObjectId;
    categoryId: ObjectId;
    subCategoryId: ObjectId;
    question: string;
    options: Array;
    optionSelected: string;
    parentId: ObjectId;
    subCategoryImage: string;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};

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

