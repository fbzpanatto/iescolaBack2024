import { Classroom } from "../../model/Classroom";
import { qUserTeacher } from "../../interfaces/interfaces";
import { User } from "../../model/User";

export class UserFormatter {

  static userResponse(row: any) {
    return {
      id: row.userId,
      email: row.email,
      password: row.password,
      person: {
        id: row.personId,
        name: row.personName,
        category: {
          id: row.categoryId
        },
        teacher: row.teacherId ? {
          id: row.teacherId,
          school: row.schoolId ? {
            id: row.schoolId
          } : null
        } : null
      }
    } as User
  }

  static years(rows: any[]) {
    return rows.reduce((acc: any[], row) => {
      let year = acc.find(y => y.id === row.year_id);

      if (!year) {
        year = {
          id: row.year_id,
          name: row.year_name,
          active: row.year_active === 1,
          createdAt: new Date(row.year_createdAt.replace(' ', 'T') + 'Z'),
          endedAt: row.year_endedAt ? new Date(row.year_endedAt.replace(' ', 'T') + 'Z') : null,
          periods: []
        };
        acc.push(year);
      }

      if (row.period_id) {
        year.periods.push({
          id: row.period_id,
          bimester: { id: row.bimester_id, name: row.bimester_name, testName: row.bimester_testName }
        });
      }

      return acc;
    }, []);
  }

  static userTeacher(el: {[key: string]: any}) {

    return {
      id: el.id,
      email: el.email,
      register: el.register,
      school: {
        id: el.schoolId ?? null
      },
      person: {
        id: el.person_id,
        name: el.person_name,
        category: { id: el.person_category_id, name: el.person_category_name },
        user: { id: el.user_id, username: el.user_name, email: el.user_email
        }
      }
    } as qUserTeacher
  }

  static superUsers(result: any[]) {
    return result.map(el => {
      return {
        id: el.id,
        email: el.email,
        register: el.register,
        person: {
          id: el.pId,
          name: el.name,
          birth: el.birth,
          category: {
            id: el.pcId,
            name: el.catName,
            active: el.active
          }
        }
      }
    })
  }

  static teacher(result: any[]) {
    return result.map(el => {
      return {
        id: el.id,
        email: el.email,
        register: el.register,
        person: {
          id: el.pId,
          name: el.name,
          birth: el.birth,
          category: {
            id: el.pcId,
            name: el.catName,
            active: el.active
          }
        }
      }
    })
  }

  static classroom(res: {[key:string]:any}) {
    return {
      id: res.id,
      name: res.name,
      nickname: res.nickname,
      shortName: res.shortName,
      school: { id: res.school_id, name: res.school_name, shortName: res.school_shortName }
    } as Classroom
  }
}
