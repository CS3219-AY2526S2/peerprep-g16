import { Transform } from "class-transformer";
import { IsArray, IsIn, IsOptional, IsString } from "class-validator";


export class SelectQuestionDto {
    @IsString()
    topic: string;

    @IsOptional()
    @IsString()
    @IsIn(['Easy', 'Medium', 'Hard'])
    difficulty?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => {
        if (!value) return [];
        return Array.from(new Set(value));
    })
    attemptedQuestionIds?: string[];
}