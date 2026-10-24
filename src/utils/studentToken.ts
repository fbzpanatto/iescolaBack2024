import { JwtPayload } from "../interfaces/interfaces";
import { PER_CAT } from "./enums";

export function resolveStudentId(authUser: JwtPayload | undefined): number | null {
  if (!authUser || authUser.category !== PER_CAT.ALUN) { return null }
  const id = authUser.student ?? authUser.user
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null
}
