import { pc } from "./personCategories";

interface Permission { GET?: boolean, POST?: boolean, PUT?: boolean, DELETE?: boolean }

const onlyGET: Permission = { GET: true, POST: false, PUT: false, DELETE: false }
const getPostPut: Permission = { GET: true, POST: true, PUT: true, DELETE: false }

const arrayOfPermissions:{ category: number, permissions: { entity: string, methods: Permission }[]}[] = [
  {
    category: pc.ADMN,
    permissions: [
      { entity: "classroom", methods: getPostPut },
      { entity: "teacher", methods: getPostPut },
      { entity: "student", methods: getPostPut },
      { entity: "transfer", methods: getPostPut },
      { entity: "test", methods: getPostPut },
      { entity: "year", methods: getPostPut },
      { entity: "report", methods: getPostPut },
      { entity: "personcategory", methods: getPostPut },
      { entity: "studentquestion", methods: getPostPut },
      { entity: "literacy", methods: getPostPut },
      { entity: "literacyreport", methods: getPostPut }
    ]
  },
  {
    category: pc.FORM,
    permissions: [
      { entity: "personcategory", methods: onlyGET },
      { entity: "year", methods: onlyGET },
      { entity: "report", methods: onlyGET },
      { entity: "classroom", methods: onlyGET },
      { entity: "teacher", methods: onlyGET },
      { entity: "student", methods: getPostPut },
      { entity: "test", methods: getPostPut },
      { entity: "transfer", methods: onlyGET },
      { entity: "studentquestion", methods: getPostPut },
      { entity: "literacy", methods: getPostPut },
      { entity: "literacyreport", methods: onlyGET }
    ]
  },
  {
    category: pc.SUPE,
    permissions: [
      { entity: "personcategory", methods: onlyGET },
      { entity: "year", methods: onlyGET },
      { entity: "report", methods: onlyGET },
      { entity: "classroom", methods: onlyGET },
      { entity: "teacher", methods: onlyGET },
      { entity: "student", methods: onlyGET },
      { entity: "test", methods: onlyGET },
      { entity: "transfer", methods: onlyGET },
      { entity: "studentquestion", methods: onlyGET },
      { entity: "literacy", methods: onlyGET },
      { entity: "literacyreport", methods: onlyGET }
    ]
  },
  {
    category: pc.DIRE,
    permissions: [
      { entity: "year", methods: onlyGET },
      { entity: "test", methods: onlyGET },
      { entity: "teacher", methods: getPostPut },
      { entity: "student", methods: getPostPut },
      { entity: "transfer", methods: onlyGET },
      { entity: "classroom", methods: onlyGET },
      { entity: "personcategory", methods: onlyGET },
      { entity: "studentquestion", methods: onlyGET },
      { entity: "literacy", methods: onlyGET },
      { entity: "literacysecond", methods: onlyGET }
    ]
  },
  {
    category: pc.VICE,
    permissions: [
      { entity: "year", methods: onlyGET },
      { entity: "test", methods: onlyGET },
      { entity: "teacher", methods: getPostPut },
      { entity: "student", methods: getPostPut },
      { entity: "transfer", methods: onlyGET },
      { entity: "classroom", methods: onlyGET },
      { entity: "personcategory", methods: onlyGET },
      { entity: "studentquestion", methods: onlyGET },
      { entity: "literacy", methods: onlyGET }
    ]
  },
  {
    category: pc.COOR,
    permissions: [
      { entity: "year", methods: onlyGET },
      { entity: "test", methods: onlyGET },
      { entity: "teacher", methods: getPostPut },
      { entity: "student", methods: getPostPut },
      { entity: "transfer", methods: onlyGET },
      { entity: "classroom", methods: onlyGET },
      { entity: "personcategory", methods: onlyGET },
      { entity: "studentquestion", methods: onlyGET },
      { entity: "literacy", methods: onlyGET }
    ]
  },
  {
    category: pc.SECR,
    permissions: [
      { entity: "year", methods: onlyGET },
      { entity: "test", methods: onlyGET },
      { entity: "teacher", methods: getPostPut },
      { entity: "student", methods: getPostPut },
      { entity: "transfer", methods: getPostPut },
      { entity: "classroom", methods: onlyGET },
      { entity: "personcategory", methods: onlyGET },
      { entity: "studentquestion", methods: onlyGET },
      { entity: "literacy", methods: onlyGET }
    ]
  },
  {
    category: pc.PROF,
    permissions: [
      { entity: "personcategory", methods: onlyGET },
      { entity: "classroom", methods: onlyGET },
      { entity: "year", methods: onlyGET },
      { entity: "test", methods: onlyGET },
      { entity: "teacher", methods: onlyGET },
      { entity: "student", methods: getPostPut },
      { entity: "transfer", methods: getPostPut },
      { entity: "studentquestion", methods: getPostPut },
      { entity: "literacy", methods: getPostPut }
    ]
  },
  {
    category: pc.MONI,
    permissions: [
      { entity: "year", methods: onlyGET },
      { entity: "test", methods: onlyGET },
      { entity: "teacher", methods: onlyGET },
      { entity: "transfer", methods: onlyGET },
      { entity: "classroom", methods: onlyGET },
      { entity: "personcategory", methods: onlyGET },
      { entity: "studentquestion", methods: onlyGET },
      { entity: "literacy", methods: onlyGET },
      { entity: "student", methods: getPostPut },
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
