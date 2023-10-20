import { personCategories } from "./personCategories";

interface Permission { GET?: boolean, POST?: boolean, PUT?: boolean, DELETE?: boolean }
const allPermissions: Permission = { GET: true, POST: true, PUT: true, DELETE: true }
const getPostPutPermissions: Permission = { GET: true, POST: true, PUT: true }

const arrayOfPermissions:{ category: number, permissions: { entity: string, methods: Permission }[]}[] = [
    {
        category: personCategories.PROFESSOR,
        permissions: [
            {
                entity: "classroom",
                methods: { GET: true }
            },
            {
                entity: "year",
                methods: { GET: true }
            },
            {
                entity: "teacher",
                methods: { GET: true }
            },
            {
                entity: "test",
                methods: getPostPutPermissions
            },
            {
                entity: "student",
                methods: getPostPutPermissions
            },
            {
                entity: "transfer",
                methods: getPostPutPermissions
            }
        ]
    },
    {
        category: personCategories.ADMINISTRADOR,
        permissions: [
            {
                entity: "classroom",
                methods: allPermissions
            },
            {
                entity: "teacher",
                methods: allPermissions
            },
            {
                entity: "student",
                methods: allPermissions
            },
            {
                entity: "transfer",
                methods: allPermissions
            },
            {
                entity: "test",
                methods: allPermissions
            },
            {
                entity: "year",
                methods: allPermissions
            }
        ]
    }
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
