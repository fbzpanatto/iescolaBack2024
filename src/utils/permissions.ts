import { personCategories } from "./personCategories";

interface Permission { GET?: boolean, POST?: boolean, PUT?: boolean, DELETE?: boolean }

const arrayOfPermissions:{ category: number, permissions: { entity: string, methods: Permission }[]}[] = [
    {
        category: personCategories.PROFESSOR,
        permissions: [
            {
                entity: "classroom",
                methods: { GET: true }
            },
            {
                entity: "teacher",
                methods: { GET: true, PUT: true }
            },
            {
                entity: "student",
                methods: { GET: true, PUT: true, POST: true }
            },
            {
                entity: "transfer",
                methods: { GET: true, POST: true, PUT: true }
            }
        ]
    },
    {
        category: personCategories.ADMINISTRADOR,
        permissions: [
            {
                entity: "classroom",
                methods: { GET: true, POST: true, PUT: true, DELETE: true }
            },
            {
                entity: "teacher",
                methods: { GET: true, POST: true, PUT: true, DELETE: true }
            },
            {
                entity: "student",
                methods: { GET: true, POST: true, PUT: true, DELETE: true }
            },
            {
                entity: "transfer",
                methods: { GET: true, POST: true, PUT: true, DELETE: true }
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
