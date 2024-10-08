import mongoose, { Schema, Model } from "mongoose";
import { IAnswer, IDerivedAnswer, IServiceSchema } from "../../types/schemaTypes";


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
    serviceShifftId: {
        type: Schema.Types.ObjectId,
        ref: "shift",
        required: [true, "Service Shift is Required"]
    },
    SelectedShiftTime: {
        shiftId: {
            type: Schema.Types.ObjectId,
            ref: "shift",
            required: [true, "Service Shift is Required"]
        },
        shiftTimeId: {
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
    isIncentiveGiven: {
        type: Boolean,
        default: false
    },
    incentiveAmount: {
        type: Number,
        default: 0,
        min: 10
    },
    isApproved: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
    isReqAcceptedByServiceProvider: {
        type: Boolean,
        default: false
    },
    // Answer array to store answers and derived answers
    answerArray: [answerSchema],
    serviceProductImage: {
        type: String,
        default: ""
    },
    otherInfo: {
        type: {
            productSerialNumber: {
                type: Number
            },
            serviceDescription: {
                type: String
            }

        }
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "user"
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },

}, { timestamps: true });


const ServiceModel: Model<IServiceSchema> = mongoose.model<IServiceSchema>('Service', ServiceSchema);
export default ServiceModel;