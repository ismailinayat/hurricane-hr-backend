import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { LeavesService } from './leaves.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { QueryLeavesDto } from './dto/query-leaves.dto';
import { RejectLeaveDto } from './dto/reject-leave.dto';

@ApiTags('leaves')
@ApiBearerAuth()
@Controller('leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Roles(Role.EMPLOYEE)
  @Post()
  @ApiOperation({ summary: 'Submit a leave request (employee only, self)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLeaveDto) {
    return this.leavesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List leave requests (admins see all/filterable, employees see only their own)',
  })
  list(@Query() query: QueryLeavesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.leavesService.list(query, user);
  }

  @Get('history')
  @ApiOperation({ summary: "Alias of GET /leaves scoped to the caller's own leave history" })
  history(@Query() query: QueryLeavesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.leavesService.list(query, user);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a pending leave request (admin only)' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.leavesService.approve(id, admin.id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a pending leave request with a mandatory reason (admin only)' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectLeaveDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.leavesService.reject(id, admin.id, dto.rejectionReason);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single leave request (admins can view any, employees only their own)',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.leavesService.findOne(id, user);
  }
}
