import { ObjectId } from "mongoose";

interface ICredentials {
    email: string;
    password: string;
};
export interface ILoginCredentials extends ICredentials { };

export interface IRegisterCredentials extends ICredentials {
    firstName: string;
    lastName: string;
    userType: string;
};

export interface IAddCategoryPayloadReq {
    name: String,
    categoryImage: String
};

export interface IAddSubCategoryPayloadReq {
    categoryId: mongoose.Types.ObjectId,
    name: string,
    subCategoryImage: string,
    questionArray:IQuestion
};

export interface IAddSubCategoryQuestionArray {
    question: string,
    options: Map<string, string>;
    derivedQuestions: IDerivedQuestion[]; // Derived questions are stored here
};

interface IDerivedQuestion  {
    option: string;
    question: string;
    options: Map<string, string>;
    derivedQuestions: IDerivedQuestion[];
};

export interface IQuestion  {
    map(arg0: (questionData: IQuestion) => Promise<import("mongoose").Types.ObjectId>): any;
    categoryId: mongoose.Types.ObjectId;
    subCategoryId: mongoose.Types.ObjectId;
    question: string;
    options: Map<string, string>;
    derivedQuestions: IDerivedQuestion[]; // Derived questions are stored here
};

export interface IFetchQuestionCatSubCatWiseParams  {
    categoryId: ObjectId;
    subCategoryId: ObjectId;
};

export interface IAddServicePayloadReq {
    categoryId: ObjectId,
    subCategoryId: ObjectId,
    serviceStartDate: Date,
    serviceShift:string,
    shiftTime: object,
    serviceZipCode: Number,
    serviceLatitude: Number,
    serviceLongitude: Number,
    isIncentiveGiven: Boolean,
    incentiveAmount: Number,
    userId: ObjectId,
    answerArray:IQuestion
};