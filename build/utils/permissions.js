"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const personCategories_1 = require("./personCategories");
const firstLevelPermissions = { GET: true, POST: false, PUT: false, DELETE: false };
const secondLevelPermissions = { GET: true, POST: true, PUT: false, DELETE: false };
const thirdLevelPermissions = { GET: true, POST: true, PUT: true, DELETE: false };
const fourthLevelPermissions = { GET: true, POST: true, PUT: true, DELETE: true };
const arrayOfPermissions = [
    {
        category: personCategories_1.personCategories.ADMINISTRADOR,
        permissions: [
            {
                entity: "classroom",
                methods: fourthLevelPermissions
            },
            {
                entity: "teacher",
                methods: fourthLevelPermissions
            },
            {
                entity: "student",
                methods: fourthLevelPermissions
            },
            {
                entity: "transfer",
                methods: fourthLevelPermissions
            },
            {
                entity: "test",
                methods: fourthLevelPermissions
            },
            {
                entity: "year",
                methods: fourthLevelPermissions
            },
            {
                entity: "report",
                methods: firstLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: fourthLevelPermissions
            },
            {
                entity: "literacy",
                methods: fourthLevelPermissions
            },
            {
                entity: "literacysecond",
                methods: fourthLevelPermissions
            },
            {
                entity: "textgendergrade",
                methods: fourthLevelPermissions
            },
            {
                entity: "textgenderreport",
                methods: fourthLevelPermissions
            },
            {
                entity: "literacyreport",
                methods: fourthLevelPermissions
            }
        ]
    },
    {
        category: personCategories_1.personCategories.SUPERVISOR,
        permissions: [
            {
                entity: "year",
                methods: firstLevelPermissions
            },
            {
                entity: "test",
                methods: thirdLevelPermissions
            },
            {
                entity: "teacher",
                methods: thirdLevelPermissions
            },
            {
                entity: "student",
                methods: thirdLevelPermissions
            },
            {
                entity: "transfer",
                methods: thirdLevelPermissions
            },
            {
                entity: "classroom",
                methods: firstLevelPermissions
            },
            {
                entity: "report",
                methods: firstLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: thirdLevelPermissions
            },
            {
                entity: "literacy",
                methods: thirdLevelPermissions
            },
            {
                entity: "literacysecond",
                methods: thirdLevelPermissions
            },
            {
                entity: "textgendergrade",
                methods: thirdLevelPermissions
            },
            {
                entity: "textgenderreport",
                methods: fourthLevelPermissions
            },
            {
                entity: "literacyreport",
                methods: fourthLevelPermissions
            }
        ]
    },
    {
        category: personCategories_1.personCategories.DIRETOR,
        permissions: [
            {
                entity: "year",
                methods: firstLevelPermissions
            },
            {
                entity: "test",
                methods: thirdLevelPermissions
            },
            {
                entity: "teacher",
                methods: thirdLevelPermissions
            },
            {
                entity: "student",
                methods: thirdLevelPermissions
            },
            {
                entity: "transfer",
                methods: thirdLevelPermissions
            },
            {
                entity: "classroom",
                methods: firstLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: thirdLevelPermissions
            },
            {
                entity: "literacy",
                methods: thirdLevelPermissions
            },
            {
                entity: "literacysecond",
                methods: thirdLevelPermissions
            },
            {
                entity: "textgendergrade",
                methods: thirdLevelPermissions
            },
        ]
    },
    {
        category: personCategories_1.personCategories.VICE_DIRETOR,
        permissions: [
            {
                entity: "year",
                methods: firstLevelPermissions
            },
            {
                entity: "test",
                methods: thirdLevelPermissions
            },
            {
                entity: "teacher",
                methods: thirdLevelPermissions
            },
            {
                entity: "student",
                methods: thirdLevelPermissions
            },
            {
                entity: "transfer",
                methods: thirdLevelPermissions
            },
            {
                entity: "classroom",
                methods: firstLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: thirdLevelPermissions
            },
            {
                entity: "literacy",
                methods: thirdLevelPermissions
            },
            {
                entity: "literacysecond",
                methods: thirdLevelPermissions
            },
            {
                entity: "textgendergrade",
                methods: thirdLevelPermissions
            },
        ]
    },
    {
        category: personCategories_1.personCategories.COORDENADOR,
        permissions: [
            {
                entity: "year",
                methods: firstLevelPermissions
            },
            {
                entity: "test",
                methods: thirdLevelPermissions
            },
            {
                entity: "teacher",
                methods: thirdLevelPermissions
            },
            {
                entity: "student",
                methods: thirdLevelPermissions
            },
            {
                entity: "transfer",
                methods: thirdLevelPermissions
            },
            {
                entity: "classroom",
                methods: firstLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: thirdLevelPermissions
            },
            {
                entity: "literacy",
                methods: thirdLevelPermissions
            },
            {
                entity: "literacysecond",
                methods: thirdLevelPermissions
            },
            {
                entity: "textgendergrade",
                methods: thirdLevelPermissions
            },
        ]
    },
    {
        category: personCategories_1.personCategories.SECRETARIO,
        permissions: [
            {
                entity: "year",
                methods: firstLevelPermissions
            },
            {
                entity: "test",
                methods: firstLevelPermissions
            },
            {
                entity: "teacher",
                methods: thirdLevelPermissions
            },
            {
                entity: "student",
                methods: thirdLevelPermissions
            },
            {
                entity: "transfer",
                methods: thirdLevelPermissions
            },
            {
                entity: "classroom",
                methods: firstLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: firstLevelPermissions
            },
            {
                entity: "literacy",
                methods: firstLevelPermissions
            },
            {
                entity: "literacysecond",
                methods: firstLevelPermissions
            },
            {
                entity: "textgendergrade",
                methods: firstLevelPermissions
            },
        ]
    },
    {
        category: personCategories_1.personCategories.MONITOR_DE_INFORMATICA,
        permissions: [
            {
                entity: "year",
                methods: firstLevelPermissions
            },
            {
                entity: "test",
                methods: firstLevelPermissions
            },
            {
                entity: "teacher",
                methods: firstLevelPermissions
            },
            {
                entity: "student",
                methods: thirdLevelPermissions
            },
            {
                entity: "transfer",
                methods: firstLevelPermissions
            },
            {
                entity: "classroom",
                methods: firstLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: firstLevelPermissions
            },
            {
                entity: "literacy",
                methods: firstLevelPermissions
            },
            {
                entity: "literacysecond",
                methods: firstLevelPermissions
            },
            {
                entity: "textgendergrade",
                methods: firstLevelPermissions
            },
        ]
    },
    {
        category: personCategories_1.personCategories.PROFESSOR,
        permissions: [
            {
                entity: "classroom",
                methods: firstLevelPermissions
            },
            {
                entity: "year",
                methods: firstLevelPermissions
            },
            {
                entity: "teacher",
                methods: firstLevelPermissions
            },
            {
                entity: "student",
                methods: thirdLevelPermissions
            },
            {
                entity: "transfer",
                methods: thirdLevelPermissions
            },
            {
                entity: "test",
                methods: thirdLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: thirdLevelPermissions
            },
            {
                entity: "literacy",
                methods: thirdLevelPermissions
            },
            {
                entity: "literacysecond",
                methods: thirdLevelPermissions
            },
            {
                entity: "textgendergrade",
                methods: thirdLevelPermissions
            },
        ]
    }
];
function userHasPermission(category, entity, method) {
    return !!arrayOfPermissions.find((permission) => {
        return permission.category === category && permission.permissions.find((permission) => {
            return permission.entity === entity && permission.methods[method];
        });
    });
}
exports.default = (category, entity, method) => {
    return userHasPermission(category, entity, method);
};
