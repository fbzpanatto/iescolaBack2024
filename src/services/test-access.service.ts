import { CLASSROOM_CATEGORIES, PER_CAT, TEST_CATEGORIES_IDS as tcids } from "../utils/enums";
import { JwtPayload } from "../interfaces/interfaces";
import { teacherRepository } from "../repositories/teacher.repository";

class TestAccessService {

  isRestrictedCreator(authUser: JwtPayload): boolean {
    return authUser.category === PER_CAT.SUPE || authUser.category === PER_CAT.FORM
  }

  isCategoryAllowedForRestricted(categoryId: number | string | undefined): boolean {
    return [tcids.SIM_ITA, tcids.AVL_ITA].includes(Number(categoryId))
  }

  async canPreviewTest(userId: number, categoryId: number, isOwner: boolean, disciplineId: number, testClassrooms: { id: number, categoryId: number }[]): Promise<boolean> {
    if (categoryId === PER_CAT.ADMN || categoryId === PER_CAT.SUPE || categoryId === PER_CAT.FORM) { return true }
    if (isOwner) { return true }
    if (categoryId === PER_CAT.SUPE_EI) { return testClassrooms.some(c => c.categoryId === CLASSROOM_CATEGORIES.EI) }

    const { classrooms } = await teacherRepository.qTeacherClassrooms(userId)
    const { disciplines } = await teacherRepository.qTeacherDisciplines(userId)

    if (!disciplines.includes(Number(disciplineId))) { return false }
    return testClassrooms.some(c => classrooms.includes(c.id))
  }
}

export const testAccessService = new TestAccessService()
