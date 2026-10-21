import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { RecruitmentRequestsService } from './recruitment-requests.service';
import type { PublicRecruitmentOpening } from './recruitment-requests.types';

@Public()
@Controller('public/recruitment-openings')
export class PublicRecruitmentOpeningsController {
  constructor(
    private readonly recruitmentRequestsService: RecruitmentRequestsService,
  ) {}

  @Get()
  listOpenings(): Promise<PublicRecruitmentOpening[]> {
    return this.recruitmentRequestsService.listPublicOpenings();
  }
}
