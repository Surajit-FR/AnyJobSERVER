import mongoose, { Schema, Model } from "mongoose";
import { ISubCategorySchema } from "../../types/schemaTypes";

const SubCategorySchema: Schema<ISubCategorySchema> = new Schema({
    categoryId:{
        type:Schema.Types.ObjectId,
        ref:"category",
        required:[true,"Category Id is Required"]
    },
    name: {
        type: String,
        required: true
    },   
    subCategoryImage: {
        type: String,
    
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
   
}, { timestamps: true });


const SubCategoryModel:Model<ISubCategorySchema> = mongoose.model<ISubCategorySchema>('subcategory',SubCategorySchema);
export default SubCategoryModel;
