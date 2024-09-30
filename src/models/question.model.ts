import mongoose, { Document, Schema, Model, model } from 'mongoose';
import { IDerivedQuestion, IQuestion } from '../../types/requests_responseType';



// Schema for Derived Questions (Recursive Structure)
const derivedQuestionSchema = new Schema<IDerivedQuestion>({
  option: { type: String, required: true },
  question: { type: String, required: true },
  options: {
    type: Map,
    of: String,
    required: true,
  },
  derivedQuestions: [this] // Recursively storing derived questions
});

// Main Question Schema
const questionSchema = new Schema<IQuestion>({
  categoryId: { type: Schema.Types.ObjectId, required: true, ref: 'Category' },
  subCategoryId: { type: Schema.Types.ObjectId, required: true, ref: 'SubCategory' },
  question: { type: String, required: true },
  options: {
    type: Map,
    of: String,
    required: true,
  },
  derivedQuestions: [derivedQuestionSchema] // Storing derived questions within main question
});

// Create and export the Question model
const QuestionModel: Model<IQuestion> = model<IQuestion>('Question', questionSchema);
export default QuestionModel;


