import mongoose, { Schema, Model } from "mongoose";
import { IServiceSchema } from "../../types/schemaTypes";
import { boolean, number, string } from "joi";


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

// Schema for Derived Answer (Recursive)
const derivedAnswerSchema = new Schema<IDerivedAnswer>({
    option: { type: String, required: true },
    answer: { type: String, required: true },
    derivedAnswers: [this] // Recursive structure to hold derived answers
});

// Schema for Main Answer
const answerSchema = new Schema<IAnswer>({
    answer: { type: String, required: true },
    selectedOption: { type: String, required: true },
    derivedAnswers: [derivedAnswerSchema] // Derived answers are nested here
});

const ServiceSchema: Schema<IServiceSchema> = new Schema({
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: "category",
        required: [true, "Category Id is Required"]
    },
    subCategoryId: {
        type: Schema.Types.ObjectId,
        ref: "subcategory",
        required: [true, "Category Id is Required"]
    },
    serviceStartDate: {
        type: Date,
        required: [true, "Service Start Date is Required"]
    },
    serviceShifft: {
        type: String,
        enum: ["Morning", "LateMorning", "Evening"],
        // required: [true, "Service Shift is Required"]
    },
    shiftTime: {
            startTime: {
                type: String,
                required: true
            },
            endTime: {
                type: String,
                required: true
            }
        
        // required:  [true, "Service Shift Time is Required"]
    },
    serviceZipCode: {
        type: Number
    },
    serviceLatitude: {
        type: Number,
        required: [true, "Service Latitude is required"]
    },
    serviceLongitude: {
        type: Number,
        required: [true, "Service Longitude is required"]
    },
    isIncentiveGiven:{
        type:Boolean,
        default:false
    },
    incentiveAmount:{
        type:Number,
        default:0,
        min:10
    },
    isApproved:{
        type:String,
        enum:["Pending","Approved","Rejected"],
        default:"Pending"
    },
     // Answer array to store answers and derived answers
     answerArray: [answerSchema],
    serviceProductImage:{
        type:String
    },
    otherInfo:{
        type:{
            productSerialNumber:{
                type:Number
            },
            serviceDescription:{
                type:String
            }
    
        }
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:"user"
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },

}, { timestamps: true });


const ServiceModel: Model<IServiceSchema> = mongoose.model<IServiceSchema>('service', ServiceSchema);
export default ServiceModel;