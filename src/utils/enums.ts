export const TRANSFER_STATUS = {
  ACCEPTED: 1,
  CANCELED: 2,
  REFUSED: 3,
  PENDING: 4
}

export const TEST_CATEGORIES_IDS = {
  LITE_1: 1,
  LITE_2: 2,
  LITE_3: 3,
  READ_2: 4,
  READ_3: 5,
  SIM_ITA: 6,
  AVL_ITA: 7,
  EDU_INF: 8,
  PRO_TXT: 9,
  EDU_INF_PART: 10,
}

export const PER_CAT = {
  ADMN: 1,
  SUPE: 2,
  DIRE: 3,
  VICE: 4,
  COOR: 5,
  SECR: 6,
  MONI: 7,
  PROF: 8,
  ALUN: 9,
  FORM: 10
}

export enum IS_OWNER {
  OWNER = '1',
  NOTOWNER = '2',
}

export const CLASSROOM_CATEGORIES = {
  PEBI: 1,
  PEBII: 2,
  EI: 3,
  EIP: 4,
  ENC: 5
}

export const EXAMS_IDS_READING = [1, 2, 3, 4, 5, 6, 7]

export const EXAMS_IDS_PRODUCTION = [8, 9, 10, 11]

export const OUT_CLASSROOMS = [1216, 1217, 1218, 1509]

const level1 = [PER_CAT.PROF, PER_CAT.MONI];
const level2 = [...level1, PER_CAT.SECR];
const level3 = [...level2, PER_CAT.COOR];
const level4 = [...level3, PER_CAT.VICE];
const level5 = [...level4, PER_CAT.DIRE, PER_CAT.FORM];
const level6 = [...level5, PER_CAT.SUPE];

export const ROLE_PERMISSIONS: Record<number, number[]> = {
  [PER_CAT.SECR]: level1,
  [PER_CAT.COOR]: level2,
  [PER_CAT.VICE]: level3,
  [PER_CAT.DIRE]: level4,
  [PER_CAT.SUPE]: level5,
  [PER_CAT.ADMN]: level6
};