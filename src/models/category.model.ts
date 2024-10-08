import mongoose, { Schema, Model } from "mongoose";
import { ICategorySchema } from "../../types/schemaTypes";

const CategorySchema: Schema<ICategorySchema> = new Schema({
    name: {
        type: String,
        default:"",
        required: true
    },
    categoryImage: {
        type: String,
        default:"",
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
}, { timestamps: true });


const CategoryModel:Model<ICategorySchema> = mongoose.model<ICategorySchema>('Category',CategorySchema);
export default CategoryModel;
