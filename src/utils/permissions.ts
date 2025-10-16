import { PERSON_CATEGORIES } from "./enums";

interface Permission { GET?: boolean, POST?: boolean, PUT?: boolean, DELETE?: boolean }

const onlyGET: Permission = { GET: true, POST: false, PUT: false, DELETE: false }
const getPostPut: Permission = { GET: true, POST: true, PUT: true, DELETE: false }
const getPut: Permission = { GET: true, POST: false, PUT: true, DELETE: false }
const getPost: Permission = { GET: true, POST: true, PUT: false, DELETE: false }
const allMethods: Permission = { GET: true, POST: true, PUT: true, DELETE: true }

const arrayOfPermissions:{ category: number, permissions: { entity: string, methods: Permission }[]}[] = [
  {
    category: PERSON_CATEGORIES.ADMN,
    permissions: [
      { entity: "classroom", methods: allMethods },
      { entity: "teacher", methods: allMethods },
      { entity: "student", methods: allMethods },
      { entity: "transfer", methods: allMethods },
      { entity: "training", methods: allMethods },
      { entity: "test", methods: allMethods },
      { entity: "year", methods: allMethods },
      { entity: "report", methods: allMethods },
      { entity: "personcategory", methods: allMethods },
      { entity: "studentquestion", methods: allMethods },
      { entity: "history", methods: onlyGET }
    ]
  },
  {
    category: PERSON_CATEGORIES.SUPE,
    permissions: [
      { entity: "classroom", methods: onlyGET },
      { entity: "teacher", methods: onlyGET },
      { entity: "student", methods: onlyGET },
      { entity: "transfer", methods: onlyGET },
      { entity: "training", methods: allMethods },
      { entity: "test", methods: onlyGET },
      { entity: "year", methods: onlyGET },
      { entity: "report", methods: onlyGET },
      { entity: "personcategory", methods: onlyGET },
      { entity: "studentquestion", methods: onlyGET },
      { entity: "history", methods: onlyGET }
    ]
  },
  {
    category: PERSON_CATEGORIES.FORM,
    permissions: [
      { entity: "classroom", methods: onlyGET },
      { entity: "teacher", methods: onlyGET },
      { entity: "student", methods: onlyGET },
      { entity: "transfer", methods: onlyGET },
      { entity: "training", methods: allMethods },
      { entity: "test", methods: onlyGET },
      { entity: "year", methods: onlyGET },
      { entity: "report", methods: onlyGET },
      { entity: "personcategory", methods: onlyGET },
      { entity: "studentquestion", methods: onlyGET },
      { entity: "history", methods: onlyGET }
    ]
  },
  {
    category: PERSON_CATEGORIES.DIRE,
    permissions: [
      { entity: "year", methods: onlyGET },
      { entity: "test", methods: allMethods },
      { entity: "classroom", methods: onlyGET },
      { entity: "personcategory", methods: onlyGET },
      { entity: "studentquestion", methods: getPostPut },
      { entity: "teacher", methods: getPostPut },
      { entity: "student", methods: getPostPut },
      { entity: "transfer", methods: getPostPut },
      { entity: "training", methods: onlyGET },
      { entity: "history", methods: onlyGET }
    ]
  },
  {
    category: PERSON_CATEGORIES.VICE,
    permissions: [
      { entity: "year", methods: onlyGET },
      { entity: "test", methods: allMethods },
      { entity: "classroom", methods: onlyGET },
      { entity: "personcategory", methods: onlyGET },
      { entity: "studentquestion", methods: getPostPut },
      { entity: "teacher", methods: getPostPut },
      { entity: "student", methods: getPostPut },
      { entity: "transfer", methods: getPostPut },
      { entity: "training", methods: onlyGET },
      { entity: "history", methods: onlyGET }
    ]
  },
  {
    category: PERSON_CATEGORIES.COOR,
    permissions: [
      { entity: "year", methods: onlyGET },
      { entity: "test", methods: allMethods },
      { entity: "classroom", methods: onlyGET },
      { entity: "personcategory", methods: onlyGET },
      { entity: "studentquestion", methods: getPostPut },
      { entity: "teacher", methods: getPostPut },
      { entity: "student", methods: getPostPut },
      { entity: "transfer", methods: getPostPut },
      { entity: "training", methods: onlyGET },
      { entity: "history", methods: onlyGET }
    ]
  },
  {
    category: PERSON_CATEGORIES.SECR,
    permissions: [
      { entity: "year", methods: onlyGET },
      { entity: "test", methods: allMethods },
      { entity: "classroom", methods: onlyGET },
      { entity: "personcategory", methods: onlyGET },
      { entity: "studentquestion", methods: onlyGET },
      { entity: "teacher", methods: getPostPut },
      { entity: "student", methods: getPostPut },
      { entity: "transfer", methods: getPostPut },
      { entity: "training", methods: onlyGET },
      { entity: "history", methods: onlyGET }
    ]
  },
  {
    category: PERSON_CATEGORIES.PROF,
    permissions: [
      { entity: "year", methods: onlyGET },
      { entity: "test", methods: getPostPut },
      { entity: "classroom", methods: onlyGET },
      { entity: "personcategory", methods: onlyGET },
      { entity: "studentquestion", methods: getPostPut },
      { entity: "teacher", methods: onlyGET },
      { entity: "student", methods: getPostPut },
      { entity: "transfer", methods: getPostPut },
      { entity: "training", methods: onlyGET },
      { entity: "history", methods: onlyGET }
    ]
  },
  {
    category: PERSON_CATEGORIES.MONI,
    permissions: [
      { entity: "year", methods: onlyGET },
      { entity: "test", methods: getPost },
      { entity: "classroom", methods: onlyGET },
      { entity: "personcategory", methods: onlyGET },
      { entity: "studentquestion", methods: onlyGET },
      { entity: "teacher", methods: onlyGET },
      { entity: "student", methods: getPostPut },
      { entity: "transfer", methods: onlyGET },
      { entity: "training", methods: onlyGET },
      { entity: "history", methods: onlyGET }
    ]
  },
  {
    category: PERSON_CATEGORIES.ALUN,
    permissions: [
      { entity: "year", methods: onlyGET },
      { entity: "student", methods: onlyGET },
      { entity: "test", methods: onlyGET },
      { entity: "studenttest", methods: getPut },
    ]
  },
]

function userHasPermission(category: number, entity: string, method: string) {

  return !!arrayOfPermissions.find((permission) => {
    return permission.category === category && permission.permissions.find((permission) => {
      return permission.entity === entity && permission.methods[method as keyof Permission]
    })
  })
}

export default (category: number, entity: string, method: string) => {
  return userHasPermission(category, entity, method)
}
