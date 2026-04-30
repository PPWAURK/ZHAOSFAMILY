import { IsEnum, IsOptional } from 'class-validator';
import {
  TRAINING_COURSE_SECTIONS,
  TRAINING_COURSE_STATUSES,
  type TrainingCourseSection,
  type TrainingCourseStatus,
} from '../training.types';

export class ListTrainingCoursesQueryDto {
  @IsOptional()
  @IsEnum(TRAINING_COURSE_SECTIONS, {
    message: 'INVALID_TRAINING_COURSE_SECTION',
  })
  section?: TrainingCourseSection;

  @IsOptional()
  @IsEnum(TRAINING_COURSE_STATUSES, {
    message: 'INVALID_TRAINING_COURSE_STATUS',
  })
  status?: TrainingCourseStatus;
}
